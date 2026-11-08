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
        static u64 previousTicks = osGetTime();
        const u64 nowTicks = osGetTime();
        const float elapsed = static_cast<float>(nowTicks - previousTicks) / 1000.0f;
        previousTicks = nowTicks;
        if (game.tick(elapsed)) changed = true;
        if (down & KEY_START) running = false;
        if (down & KEY_A) { game.sendInstruction("OLD LAB"); changed = true; }
        if (down & KEY_B) { game.observe(); changed = true; }
        if (down & KEY_X) { game.waitAndSavePower(); changed = true; }
        if (down & KEY_Y) { game.advanceDay(); changed = true; }
        if (down & KEY_TOUCH) {
            touchPosition touch;
            hidTouchRead(&touch);
            if (touch.py >= 204) {
                if (touch.px < 80) { game.sendInstruction("OLD LAB"); changed = true; }
                else if (touch.px < 160) { game.observe(); changed = true; }
                else if (touch.px < 236) { game.waitAndSavePower(); changed = true; }
                else { game.advanceDay(); changed = true; }
            }
        }
        if (changed) saveOk = catdrift::Save::write(game.state());

        ui.render(game.state(), saveOk);
        gspWaitForVBlank();
    }

    catdrift::Save::write(game.state());
    ui.shutdown();
    gfxExit();
    return 0;
}
