#include <3ds.h>
#include <cstdio>

#include "game/game.hpp"

namespace {

PrintConsole topScreen;
PrintConsole bottomScreen;

void drawTop(const catdrift::GameState& s) {
    consoleSelect(&topScreen);
    consoleClear();
    std::printf("小猫漂流 · 3DS MVP\n\n");
    std::printf("第 %d 天\n", s.day);
    std::printf("地点：%s\n", s.location.c_str());
    if (!s.destination.empty()) {
        std::printf("航向：%s（还剩 %d 天）\n", s.destination.c_str(), s.travelDays);
    } else {
        std::printf("航向：漂流中\n");
    }
    std::printf("猫的状态：%s\n", catdrift::moodName(s.mood));
    std::printf("BB机电量：%d\n", s.battery);
    std::printf("通讯：%s\n", s.lostContact ? "失联" : "在线");
}

void drawBottom(const catdrift::GameState& s) {
    consoleSelect(&bottomScreen);
    consoleClear();
    std::printf("卫星地图\n\n");
    std::printf("       [旧科研站]\n");
    std::printf("            |\n");
    std::printf("   [漂流海域] ---- [浅海遗迹]\n\n");
    std::printf("BB机最新消息：\n%s\n\n", s.message.c_str());
    std::printf("A  前往旧科研站\n");
    std::printf("B  观察卫星\n");
    std::printf("X  停留并节省电量\n");
    std::printf("Y  经过一天\n");
    std::printf("START 退出\n");
}

} // namespace

int main() {
    gfxInitDefault();
    consoleInit(GFX_TOP, &topScreen);
    consoleInit(GFX_BOTTOM, &bottomScreen);

    catdrift::Game game;
    bool running = true;
    while (aptMainLoop() && running) {
        hidScanInput();
        const u32 down = hidKeysDown();
        if (down & KEY_START) running = false;
        if (down & KEY_A) game.sendInstruction("旧科研站");
        if (down & KEY_B) game.observe();
        if (down & KEY_X) game.waitAndSavePower();
        if (down & KEY_Y) game.advanceDay();

        drawTop(game.state());
        drawBottom(game.state());
        gfxFlushBuffers();
        gfxSwapBuffers();
        gspWaitForVBlank();
    }

    gfxExit();
    return 0;
}
