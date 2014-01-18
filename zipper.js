modules.zipper = '2014-January-16'

function Zipper() {
    this.serializer = new SnapSerializer();
}

Zipper.prototype.open = function(blob, options) {
    //alert(blob);
    options = typeof options !== 'undefined' ? options : {base64: true};
    var zip = new JSZip(blob, options);
    var v = 1/0;
    
    // Iterate through blocks and load them all
    var f = zip.file("blocks.json");
    var f_text = f.asText();
    console.log(f_text);
    var blockJSON = eval('(' + f_text + ')');
    console.log(blockJSON);
    for(var block in blockJSON) {
        console.log("Loading block " + block);
        SpriteMorph.prototype._blocks[block] = blockJSON[block];
        SpriteMorph.prototype[block] = eval('(' + zip.file("blocks/" + block + ".js").asText() + ')');
        console.log(SpriteMorph.prototype[block]);
    }
    
    SpriteMorph.prototype.initBlocks();
    //alert("Have zip file!");
    return zip;
}

Zipper.prototype.save = function(self, name) {
    var zip = new JSZip(), content;
    zip.file("stage.xml", this.serializer.serialize(self.stage));
    localStorage['-snap-project-' + name]
        = content = zip.generate();
    //location.hash = '#open:' + content;
    //location.href="data:application/zip;base64,"+content;
}
