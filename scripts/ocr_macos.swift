// macOS built-in Vision OCR. Usage: swift ocr_macos.swift /absolute/image.png
import Foundation
import ImageIO
import Vision

struct TextBox: Codable {
    let text: String
    let confidence: Float
    let box: [Int]
    let alternatives: [String]
}

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: swift ocr_macos.swift /absolute/image.png\n", stderr)
    exit(2)
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Unable to open image\n", stderr)
    exit(2)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.automaticallyDetectsLanguage = true
if let supported = try? request.supportedRecognitionLanguages() {
    let preferred = ["zh-Hans", "zh-Hant", "en-US"]
    let available = preferred.filter { supported.contains($0) }
    if !available.isEmpty { request.recognitionLanguages = available }
}
do {
    try VNImageRequestHandler(cgImage: image).perform([request])
    let boxes: [TextBox] = (request.results ?? []).compactMap { observation in
        guard let best = observation.topCandidates(3).first else { return nil }
        let r = observation.boundingBox
        let x = Int((r.minX * CGFloat(image.width)).rounded())
        let y = Int(((1 - r.maxY) * CGFloat(image.height)).rounded())
        let w = Int((r.width * CGFloat(image.width)).rounded())
        let h = Int((r.height * CGFloat(image.height)).rounded())
        return TextBox(text: best.string, confidence: best.confidence,
                       box: [x, y, w, h],
                       alternatives: observation.topCandidates(3).map { $0.string })
    }.sorted { a, b in
        abs(a.box[1] - b.box[1]) < 12 ? a.box[0] < b.box[0] : a.box[1] < b.box[1]
    }
    let data = try JSONEncoder().encode(boxes)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    fputs("OCR failed: \(error)\n", stderr)
    exit(1)
}
