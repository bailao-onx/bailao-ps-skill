/* Set PSC_FONT_CFG before evaluating. See typography.md. Never edits the source. */
(function (cfg) {
    if (!cfg || !(cfg.candidates instanceof Array) || cfg.candidates.length < 1 || cfg.candidates.length > 12)
        throw Error('Supply 1-12 candidate PostScript font names');
    var sourceFile = new File(cfg.psd), out = new Folder(cfg.output);
    if (!sourceFile.exists || out.exists) throw Error('Source must exist; output must be a fresh directory');
    var stopFile = new File(cfg.output + '/CANCEL'), opened = null, trial = null;
    var previousUnits = app.preferences.rulerUnits;
    function checkCancel() { if (stopFile.exists) throw Error('Cancelled between Photoshop operations'); }
    function report(message) {
        var f = new File(cfg.output + '/status.txt'); f.open('w'); f.write(message); f.close();
    }
    function collect(parent, name, hits) {
        for (var n = 0; n < parent.layers.length; n++) {
            var layer = parent.layers[n];
            if (layer.typename === 'LayerSet') collect(layer, name, hits);
            else if (layer.name === name && layer.kind === LayerKind.TEXT) hits.push(layer);
        }
    }
    var approvedNames = {};
    for (var n = 0; n < app.fonts.length; n++) approvedNames['f:' + app.fonts[n].postScriptName] = true;
    for (var n = 0; n < cfg.candidates.length; n++)
        if (typeof cfg.candidates[n] !== 'string' || !approvedNames['f:' + cfg.candidates[n]])
            throw Error('Font unavailable: ' + cfg.candidates[n]);
    if (!out.create()) throw Error('Cannot create output directory');
    try {
        app.preferences.rulerUnits = Units.PIXELS;
        // Refuse an already-open source so cleanup never closes a user's document.
        for (var n = 0; n < app.documents.length; n++) {
            var probe = new ActionReference(); probe.putIdentifier(charIDToTypeID('Dcmn'), app.documents[n].id);
            var desc = executeActionGet(probe), key = stringIDToTypeID('fileReference');
            if (desc.hasKey(key) && desc.getPath(key).fsName === sourceFile.fsName)
                throw Error('Source is already open; close its saved document before this isolated comparison');
        }
        checkCancel(); opened = app.open(sourceFile);
        var sourceHits = []; collect(opened, cfg.layer, sourceHits);
        if (sourceHits.length !== 1) throw Error('Expected exactly one named live text layer');
        for (var index = 0; index < cfg.candidates.length; index++) {
            checkCancel(); report('RUNNING ' + (index + 1) + '/' + cfg.candidates.length);
            trial = opened.duplicate('Font comparison ' + (index + 1), false);
            var hits = []; collect(trial, cfg.layer, hits);
            hits[0].textItem.font = cfg.candidates[index];
            if (hits[0].textItem.font !== cfg.candidates[index]) throw Error('Font substitution detected');
            checkCancel();
            if (cfg.crop) trial.crop(cfg.crop);
            trial.saveAs(new File(out.fsName + '/candidate-' + (index + 1) + '.png'), new PNGSaveOptions(), true);
            trial.close(SaveOptions.DONOTSAVECHANGES); trial = null;
        }
        report('EXPORTED ' + cfg.candidates.join(' | ') + '\nVISUAL REVIEW REQUIRED');
    } catch (error) { report('FAILED ' + error); throw error; }
    finally {
        if (trial) trial.close(SaveOptions.DONOTSAVECHANGES);
        if (opened) opened.close(SaveOptions.DONOTSAVECHANGES);
        app.preferences.rulerUnits = previousUnits;
    }
})(PSC_FONT_CFG);
