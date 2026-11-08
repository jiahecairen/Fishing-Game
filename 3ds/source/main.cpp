#include <3ds.h>
#include <cstdio>

#include "game/game.hpp"
#include "save/save.hpp"

namespace {

PrintConsole topScreen;
PrintConsole bottomScreen;

void drawTop(const catdrift::GameState& s) {
    consoleSelect(&topScreen);
    consoleClear();
    std::printf("CAT DRIFT - 3DS MVP\n\n");
    std::printf("DAY %d\n", s.day);
    std::printf("PLACE: %s\n", s.location.c_str());
    if (!s.destination.empty()) {
        std::printf("TO: %s (%d DAYS)\n", s.destination.c_str(), s.travelDays);
    } else {
        std::printf("TO: DRIFTING\n");
    }
    std::printf("CAT: %s\n", catdrift::moodName(s.mood));
    std::printf("BEEPER: %d\n", s.battery);
    std::printf("LINK: %s\n", s.lostContact ? "LOST" : "ONLINE");
}

void drawBottom(const catdrift::GameState& s, bool saveOk) {
    consoleSelect(&bottomScreen);
    consoleClear();
    std::printf("SATELLITE MAP\n\n");
    std::printf("       [OLD LAB]\n");
    std::printf("            |\n");
    std::printf("   [DRIFT SEA] ---- [SHALLOW RUINS]\n\n");
    std::printf("BEEPER MESSAGE:\n%s\n\n", s.message.c_str());
    std::printf("SAVE: %s\n\n", saveOk ? "OK" : "FAILED - CHECK SD");
    std::printf("A  GO TO OLD LAB\n");
    std::printf("B  SCAN SATELLITE\n");
    std::printf("X  REST / SAVE POWER\n");
    std::printf("Y  ADVANCE ONE DAY\n");
    std::printf("START  EXIT\n");
}

} // namespace

int main() {
    gfxInitDefault();
    consoleInit(GFX_TOP, &topScreen);
    consoleInit(GFX_BOTTOM, &bottomScreen);

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

        drawTop(game.state());
        drawBottom(game.state(), saveOk);
        gfxFlushBuffers();
        gfxSwapBuffers();
        gspWaitForVBlank();
    }

    catdrift::Save::write(game.state());
    gfxExit();
    return 0;
}
