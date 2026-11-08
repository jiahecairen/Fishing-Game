#include <3ds.h>

#include "game/game.hpp"
#include "save/save.hpp"
#include "ui/ui.hpp"

int main() {
    gfxInitDefault();
    catdrift::Ui ui;
    if (!ui.init()) {
        gfxExit();
        return 1;
    }

    catdrift::Game game;
    const bool loaded = catdrift::Save::load(game.mutableState());
    bool saveOk = loaded || catdrift::Save::write(game.state());
    bool running = true;

    while (aptMainLoop() && running) {
        hidScanInput();
        const u32 down = hidKeysDown();
        bool changed = false;
        if (down & KEY_START) running = false;
        if (down & KEY_A) { game.sendInstruction("OLD LAB"); changed = true; }
        if (down & KEY_B) { game.observe(); changed = true; }
        if (down & KEY_X) { game.waitAndSavePower(); changed = true; }
        if (down & KEY_Y) { game.advanceDay(); changed = true; }
        if (changed) saveOk = catdrift::Save::write(game.state());

        ui.render(game.state(), saveOk);
        gspWaitForVBlank();
    }

    catdrift::Save::write(game.state());
    ui.shutdown();
    gfxExit();
    return 0;
}
