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

    C2D_TargetClear(top_, SKY);
    C2D_SceneBegin(top_);
    rect(0, 96, 400, 144, SEA);
    rect(0, 148, 400, 92, SEA_DARK);
    rect(0, 0, 400, 30, PANEL);
    text("CAT DRIFT", 14, 7, 0.65f, WHITE);
    std::snprintf(line, sizeof(line), "DAY %d", state.day);
    text(line, 320, 8, 0.48f, YELLOW);
    circle(350, 62, 18, YELLOW);
    circle(110, 62, 13, WHITE);
    circle(126, 62, 17, WHITE);
    rect(100, 62, 44, 12, WHITE);

    rect(136 + boatX, 147 + wave, 122, 20, CAT_DARK);
    rect(148 + boatX, 137 + wave, 96, 14, SAND);
    rect(190 + boatX, 100 + wave, 5, 38, CAT_DARK);
    C2D_DrawTriangle(195 + boatX, 105 + wave, WHITE, 246 + boatX, 128 + wave, WHITE, 195 + boatX, 128 + wave, WHITE, 0.5f);
    circle(168 + boatX, 128 + wave + catY, 13, CAT_ORANGE);
    C2D_DrawTriangle(157 + boatX, 119 + wave + catY, CAT_ORANGE, 162 + boatX, 104 + wave + catY, CAT_ORANGE, 168 + boatX, 120 + wave + catY, CAT_ORANGE, 0.5f);
    C2D_DrawTriangle(168 + boatX, 120 + wave + catY, CAT_ORANGE, 176 + boatX, 104 + wave + catY, CAT_ORANGE, 180 + boatX, 121 + wave + catY, CAT_ORANGE, 0.5f);
    circle(164 + boatX, 126 + wave + catY, 2, CAT_DARK);
    circle(173 + boatX, 126 + wave + catY, 2, CAT_DARK);
    rect(134, 166, 128, 4, WHITE);
    rect(150 + wave, 183, 74, 3, WHITE);
    rect(250 - wave, 192, 36, 3, WHITE);

    rect(12, 202, 376, 26, PANEL);
    text("PLACE", 20, 208, 0.38f, YELLOW);
    text(state.location.c_str(), 72, 208, 0.38f, WHITE);
    text(state.lostContact ? "SIGNAL LOST" : "SIGNAL ONLINE", 270, 208, 0.35f, state.lostContact ? YELLOW : WHITE);

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
    if (!state.destination.empty()) text("ROUTE ACTIVE", 105, 38, 0.32f, SEA_DARK);

    rect(12, 144, 296, 52, PANEL);
    text("BEEPER", 20, 151, 0.38f, YELLOW);
    text(state.message.c_str(), 20, 168, 0.34f, WHITE, C2D_WordWrap);
    const u32 button = C2D_Color32(0x2B, 0x5D, 0x70, 0xFF);
    rect(8, 204, 72, 26, button);
    rect(84, 204, 72, 26, button);
    rect(160, 204, 72, 26, button);
    rect(236, 204, 76, 26, button);
    text("A GO", 27, 211, 0.34f, WHITE);
    text("B SCAN", 94, 211, 0.32f, WHITE);
    text("X REST", 169, 211, 0.32f, WHITE);
    text("Y DAY", 253, 211, 0.32f, WHITE);
    text(saveOk ? "SAVE OK" : "SAVE ERROR", 235, 187, 0.31f, saveOk ? SEA_DARK : CAT_DARK);
    C3D_FrameEnd(0);
}

void Ui::shutdown() {
    if (textBuf_) C2D_TextBufDelete(textBuf_);
    C2D_Fini();
    C3D_Fini();
}

} // namespace catdrift
