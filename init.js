var world;
window.onload = function () {
    world = new WorldMorph(document.getElementById('world'));
    new IDE_Morph().openIn(world);
    setInterval(loop, 1);
};
function loop() {
    world.doOneCycle();
};

