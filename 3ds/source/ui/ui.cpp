#include "ui.hpp"

#include <cstdio>
#include <cmath>

namespace catdrift {
namespace {
const u32 SKY = C2D_Color32(0x8B, 0xD8, 0xE8, 0xFF);
const u32 SEA = C2D_Color32(0x35, 0xA9, 0xC2, 0xFF);
const u32 SEA_DARK = C2D_Color32(0x1D, 0x78, 0x9A, 0xFF);
const u32 SAND = C2D_Color32(0xF4, 0xD6, 0x91, 0xFF);
const u32 CAT_ORANGE = C2D_Color32(0xF2, 0x9B, 0x52, 0xFF);
const u32 CAT_DARK = C2D_Color32(0x8A, 0x4A, 0x2A, 0xFF);
const u32 PANEL = C2D_Color32(0x12, 0x2C, 0x43, 0xE8);
const u32 PANEL_LIGHT = C2D_Color32(0xD8, 0xF3, 0xF2, 0xF0);
const u32 WHITE = C2D_Color32(0xFF, 0xFF, 0xFF, 0xFF);
const u32 INK = C2D_Color32(0x16, 0x2D, 0x3D, 0xFF);
const u32 YELLOW = C2D_Color32(0xFF, 0xD2, 0x5A, 0xFF);
void rect(float x, float y, float w, float h, u32 c) { C2D_DrawRectSolid(x, y, 0.5f, w, h, c); }
void circle(float x, float y, float r, u32 c) { C2D_DrawCircleSolid(x, y, 0.4f, r, c); }
}

Ui::Ui() : top_(nullptr), bottom_(nullptr), textBuf_(nullptr), time_(0.0f) {}

bool Ui::init() {
    if (!C3D_Init(C3D_DEFAULT_CMDBUF_SIZE)) return false;
    if (!C2D_Init(C2D_DEFAULT_MAX_OBJECTS)) return false;
    C2D_Prepare();
    top_ = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
    bottom_ = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
    textBuf_ = C2D_TextBufNew(4096);
    return top_ && bottom_ && textBuf_;
}

void Ui::text(const char* value, float x, float y, float size, u32 color, u32 flags) {
    C2D_Text item;
    C2D_TextParse(&item, textBuf_, value);
    C2D_TextOptimize(&item);
    C2D_DrawText(&item, flags | C2D_WithColor, x, y, 0.1f, size, size, color);
}

void Ui::render(const GameState& state, bool saveOk) {
    char line[128];
    time_ += 1.0f / 60.0f;
    const float wave = std::sin(time_ * 1.8f) * 3.0f;
    const float boatX = std::sin(time_ * 0.75f) * 3.0f;
    const float catY = std::sin(time_ * 1.5f) * 1.5f;
    C2D_TextBufClear(textBuf_);
    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);

    const bool rain = state.weather == "RAIN";
    const bool fog = state.weather == "FOG";
    const u32 sky = rain ? C2D_Color32(0x62, 0x82, 0x9B, 0xFF) : fog ? C2D_Color32(0xAC, 0xC3, 0xC4, 0xFF) : SKY;
    C2D_TargetClear(top_, sky);
    C2D_SceneBegin(top_);
    rect(0, 96, 400, 144, SEA);
    rect(0, 148, 400, 92, SEA_DARK);
    rect(0, 0, 400, 30, PANEL);
    text("CAT DRIFT", 14, 7, 0.65f, WHITE);
    std::snprintf(line, sizeof(line), "DAY %d", state.day);
    text(line, 320, 8, 0.48f, YELLOW);
    std::snprintf(line, sizeof(line), "BEEP %d", state.battery);
    text(line, 250, 8, 0.42f, WHITE);
    if (!rain && !fog) circle(350, 62, 18, YELLOW);
    circle(110, 62, 13, WHITE);
    circle(126, 62, 17, WHITE);
    rect(100, 62, 44, 12, WHITE);

    rect(136 + boatX, 147 + wave, 122, 20, CAT_DARK);
    rect(148 + boatX, 137 + wave, 96, 14, SAND);
    rect(190 + boatX, 100 + wave, 5, 38, CAT_DARK);
    C2D_DrawTriangle(195 + boatX, 105 + wave, WHITE, 246 + boatX, 128 + wave, WHITE, 195 + boatX, 128 + wave, WHITE, 0.5f);
    // A deliberately oversized pixel cat so it remains readable on the small screen.
    rect(151 + boatX, 108 + wave + catY, 35, 29, CAT_ORANGE);
    rect(156 + boatX, 99 + wave + catY, 28, 25, CAT_ORANGE);
    C2D_DrawTriangle(156 + boatX, 105 + wave + catY, CAT_ORANGE, 159 + boatX, 91 + wave + catY, CAT_ORANGE, 166 + boatX, 104 + wave + catY, CAT_ORANGE, 0.5f);
    C2D_DrawTriangle(174 + boatX, 104 + wave + catY, CAT_ORANGE, 181 + boatX, 91 + wave + catY, CAT_ORANGE, 184 + boatX, 106 + wave + catY, CAT_ORANGE, 0.5f);
    rect(162 + boatX, 108 + wave + catY, 4, 4, CAT_DARK);
    rect(175 + boatX, 108 + wave + catY, 4, 4, CAT_DARK);
    rect(168 + boatX, 117 + wave + catY, 5, 3, CAT_DARK);
    // The cat is always fishing when it is not travelling.
    if (state.destination.empty()) {
        const float bobX = 285.0f + std::sin(time_ * 1.1f) * 4.0f;
        const float bobY = 164.0f + wave;
        C2D_DrawLine(178 + boatX, 119 + wave + catY, CAT_DARK,
            214 + boatX, 86 + wave, CAT_DARK, 2.0f, 0.3f);
        C2D_DrawLine(214 + boatX, 86 + wave, WHITE,
            bobX, bobY, WHITE, 1.0f, 0.3f);
        circle(bobX, bobY, 4, CAT_ORANGE);
        circle(bobX, bobY + 6, 10, C2D_Color32(0xA3, 0xE9, 0xEE, 0xA0));
        text("FISHING", 278, 102, 0.32f, WHITE);
    } else {
        text("SAILING", 278, 102, 0.32f, WHITE);
    }
    rect(134, 166, 128, 4, WHITE);
    rect(150 + wave, 183, 74, 3, WHITE);
    rect(250 - wave, 192, 36, 3, WHITE);
    if (rain) {
        for (int i = 0; i < 12; ++i) {
            const float x = static_cast<float>((i * 37 + static_cast<int>(time_ * 40.0f)) % 420 - 10);
            const float y = static_cast<float>((i * 23 + static_cast<int>(time_ * 90.0f)) % 150);
            C2D_DrawLine(x, y, WHITE, x - 5, y + 13, WHITE, 1.0f, 0.2f);
        }
    }

    rect(12, 202, 376, 26, PANEL);
    text("PLACE", 20, 208, 0.38f, YELLOW);
    text(state.location.c_str(), 72, 208, 0.38f, WHITE);
    text(state.weather.c_str(), 170, 208, 0.35f, rain ? YELLOW : WHITE);
    text(state.lostContact ? "SIGNAL LOST" : "SIGNAL ONLINE", 270, 208, 0.35f, state.lostContact ? YELLOW : WHITE);
    text("CAT IS LIVING...", 14, 38, 0.34f, SEA_DARK);

    C2D_TargetClear(bottom_, PANEL_LIGHT);
    C2D_SceneBegin(bottom_);
    rect(0, 0, 320, 28, PANEL);
    text("SATELLITE MAP", 12, 7, 0.52f, WHITE);
    rect(12, 38, 296, 98, C2D_Color32(0xA8, 0xDC, 0xD0, 0xFF));
    rect(18, 44, 284, 86, C2D_Color32(0xB9, 0xE8, 0xDC, 0xFF));
    circle(86, 88, 12, SEA_DARK);
    circle(218, 70, 12, SAND);
    circle(246, 112, 12, SAND);
    rect(92, 86, 118, 4, SEA_DARK);
    text("DRIFT SEA", 50, 104, 0.35f, WHITE);
    text("OLD LAB", 199, 58, 0.34f, INK);
    text("RUINS", 230, 121, 0.34f, INK);
    text(state.animal.empty() ? "ANIMAL LINK: NONE" : "ANIMAL LINK: GULL", 18, 134, 0.30f, SEA_DARK);
    if (!state.destination.empty()) text("ROUTE ACTIVE", 105, 38, 0.32f, SEA_DARK);

    rect(12, 144, 296, 52, PANEL);
    text("BEEPER", 20, 151, 0.38f, YELLOW);
    text(state.message.c_str(), 20, 168, 0.34f, WHITE, C2D_WordWrap);
    if (!state.lastCatch.empty()) {
        text("LAST CATCH", 20, 184, 0.28f, YELLOW);
        text(state.lastCatch.c_str(), 94, 184, 0.28f, WHITE);
    }
    const u32 button = C2D_Color32(0x2B, 0x5D, 0x70, 0xFF);
    rect(8, 196, 72, 30, button);
    rect(84, 196, 72, 30, button);
    rect(160, 196, 72, 30, button);
    rect(236, 196, 76, 30, button);
    text("A GO", 27, 201, 0.34f, WHITE);
    text("B SCAN", 94, 201, 0.32f, WHITE);
    text("X REST", 169, 201, 0.32f, WHITE);
    text("Y DAY", 253, 201, 0.32f, WHITE);
    text(saveOk ? "SAVE OK" : "SAVE ERROR", 235, 181, 0.31f, saveOk ? SEA_DARK : CAT_DARK);
    C3D_FrameEnd(0);
}

void Ui::shutdown() {
    if (textBuf_) C2D_TextBufDelete(textBuf_);
    C2D_Fini();
    C3D_Fini();
}

} // namespace catdrift
