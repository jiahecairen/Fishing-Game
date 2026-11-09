#include "ui.hpp"

#include <cmath>
#include <cstdio>
#include <string>

#include "cat_t3x.h"
#include "boat_t3x.h"
#include "rod_t3x.h"
#include "fish_t3x.h"
#include "cloud_t3x.h"
#include "gull_t3x.h"

namespace catdrift {
namespace {

const u32 NAVY = C2D_Color32(0x16, 0x35, 0x4B, 0xFF);
const u32 NAVY_2 = C2D_Color32(0x20, 0x4A, 0x61, 0xFF);
const u32 SKY = C2D_Color32(0x89, 0xD8, 0xE6, 0xFF);
const u32 WATER = C2D_Color32(0x35, 0xA9, 0xC2, 0xFF);
const u32 DEEP_WATER = C2D_Color32(0x1F, 0x7D, 0x9C, 0xFF);
const u32 SEA_DARK = C2D_Color32(0x1D, 0x78, 0x9A, 0xFF);
const u32 MAP = C2D_Color32(0xB9, 0xE8, 0xDC, 0xFF);
const u32 MAP_EDGE = C2D_Color32(0x91, 0xD3, 0xCB, 0xFF);
const u32 CREAM = C2D_Color32(0xFF, 0xF3, 0xC7, 0xFF);
const u32 ORANGE = C2D_Color32(0xF3, 0x9A, 0x4B, 0xFF);
const u32 BROWN = C2D_Color32(0x8A, 0x4A, 0x2A, 0xFF);
const u32 WHITE = C2D_Color32(0xFF, 0xFF, 0xFF, 0xFF);
const u32 GOLD = C2D_Color32(0xFF, 0xD0, 0x58, 0xFF);
const u32 INK = C2D_Color32(0x18, 0x38, 0x4B, 0xFF);
const u32 MUTED = C2D_Color32(0x3D, 0x7C, 0x88, 0xFF);
const u32 BUTTON = C2D_Color32(0x2A, 0x65, 0x78, 0xFF);

void rect(float x, float y, float w, float h, u32 color) {
    C2D_DrawRectSolid(x, y, 0.5f, w, h, color);
}

void circle(float x, float y, float radius, u32 color) {
    C2D_DrawCircleSolid(x, y, 0.4f, radius, color);
}

} // namespace

Ui::Ui()
    : top_(nullptr), bottom_(nullptr), textBuf_(nullptr),
      catSheet_(nullptr), boatSheet_(nullptr), rodSheet_(nullptr),
      fishSheet_(nullptr), cloudSheet_(nullptr), gullSheet_(nullptr),
      cat_{}, boat_{}, rod_{}, fish_{}, cloud_{}, gull_{}, time_(0.0f) {}

bool Ui::init() {
    if (!C3D_Init(C3D_DEFAULT_CMDBUF_SIZE)) return false;
    if (!C2D_Init(C2D_DEFAULT_MAX_OBJECTS)) return false;
    C2D_Prepare();
    top_ = C2D_CreateScreenTarget(GFX_TOP, GFX_LEFT);
    bottom_ = C2D_CreateScreenTarget(GFX_BOTTOM, GFX_LEFT);
    textBuf_ = C2D_TextBufNew(4096);
    catSheet_ = C2D_SpriteSheetLoadFromMem(cat_t3x, cat_t3x_size);
    boatSheet_ = C2D_SpriteSheetLoadFromMem(boat_t3x, boat_t3x_size);
    rodSheet_ = C2D_SpriteSheetLoadFromMem(rod_t3x, rod_t3x_size);
    fishSheet_ = C2D_SpriteSheetLoadFromMem(fish_t3x, fish_t3x_size);
    cloudSheet_ = C2D_SpriteSheetLoadFromMem(cloud_t3x, cloud_t3x_size);
    gullSheet_ = C2D_SpriteSheetLoadFromMem(gull_t3x, gull_t3x_size);
    if (catSheet_) cat_ = C2D_SpriteSheetGetImage(catSheet_, 0);
    if (boatSheet_) boat_ = C2D_SpriteSheetGetImage(boatSheet_, 0);
    if (rodSheet_) rod_ = C2D_SpriteSheetGetImage(rodSheet_, 0);
    if (fishSheet_) fish_ = C2D_SpriteSheetGetImage(fishSheet_, 0);
    if (cloudSheet_) cloud_ = C2D_SpriteSheetGetImage(cloudSheet_, 0);
    if (gullSheet_) gull_ = C2D_SpriteSheetGetImage(gullSheet_, 0);
    return top_ && bottom_ && textBuf_ && catSheet_ && boatSheet_ && rodSheet_ &&
        fishSheet_ && cloudSheet_ && gullSheet_;
}

void Ui::text(const char* value, float x, float y, float size, u32 color, u32 flags) {
    C2D_Text item;
    C2D_TextParse(&item, textBuf_, value);
    C2D_TextOptimize(&item);
    // Panels use depth 0.5; text must be in front of them.
    C2D_DrawText(&item, flags | C2D_WithColor, x, y, 0.9f, size, size, color);
}

void Ui::render(const GameState& state, bool saveOk) {
    char line[128];
    std::string message = state.message;
    if (message.size() > 36) message = message.substr(0, 33) + "...";
    std::string animal = state.animal.empty() ? "ANIMAL LINK: NONE" : "ANIMAL LINK: " + state.animal;

    time_ += 1.0f / 60.0f;
    const float wave = std::sin(time_ * 1.8f) * 2.5f;
    const float boatX = std::sin(time_ * 0.75f) * 2.5f;
    const float catY = std::sin(time_ * 1.5f) * 1.5f;
    const bool rain = state.weather == "RAIN";
    const bool fog = state.weather == "FOG";
    const u32 sky = rain ? C2D_Color32(0x63, 0x83, 0x9B, 0xFF) : fog ? C2D_Color32(0xAF, 0xC6, 0xC7, 0xFF) : SKY;

    C2D_TextBufClear(textBuf_);
    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);

    // ---------- Top screen: the living scene ----------
    C2D_TargetClear(top_, sky);
    C2D_SceneBegin(top_);
    rect(0, 0, 400, 32, NAVY);
    rect(0, 94, 400, 146, WATER);
    rect(0, 148, 400, 92, DEEP_WATER);
    rect(12, 42, 150, 22, C2D_Color32(0xD8, 0xF3, 0xF2, 0xC8));
    rect(255, 42, 133, 22, C2D_Color32(0xD8, 0xF3, 0xF2, 0xC8));

    if (!rain && !fog) circle(351, 62, 15, GOLD);
    if (fog) {
        rect(78, 57, 72, 9, WHITE);
        rect(92, 49, 56, 9, WHITE);
    } else {
        circle(110, 57, 10, WHITE);
        circle(126, 57, 14, WHITE);
        rect(98, 57, 45, 10, WHITE);
    }

    // Pixel-art scene assets. Their transparent margins make the animation feel
    // like a small diorama without hiding the status bar below.
    C2D_DrawImageAt(cloud_, 24, 42, 0.65f, nullptr, 0.18f, 0.18f);
    C2D_DrawImageAt(cloud_, 286, 45, 0.65f, nullptr, -0.16f, 0.16f);
    C2D_DrawImageAt(gull_, 302, 80 + wave, 0.66f, nullptr, 0.14f, 0.14f);
    // Keep scene art in front of the water fill (depth 0.5), otherwise only
    // the transparent sprite margins remain visible at the waterline.
    C2D_DrawImageAt(boat_, 132 + boatX, 113 + wave, 0.68f, nullptr, 0.24f, 0.24f);
    C2D_DrawImageAt(cat_, 145 + boatX, 83 + wave + catY, 0.70f, nullptr, 0.13f, 0.13f);
    C2D_DrawImageAt(rod_, 204 + boatX, 77 + wave, 0.69f, nullptr, 0.13f, 0.13f);

    if (state.destination.empty()) {
        const float bobX = 285.0f + std::sin(time_ * 1.1f) * 4.0f;
        const float bobY = 164.0f + wave;
        C2D_DrawLine(225 + boatX, 112 + wave, WHITE, bobX, bobY, WHITE, 1.0f, 0.3f);
        C2D_DrawImageAt(fish_, bobX - 22.0f, bobY + 7.0f, 0.67f, nullptr, 0.07f, 0.07f);
        circle(bobX, bobY, 4, ORANGE);
        circle(bobX, bobY + 6, 10, C2D_Color32(0xA3, 0xE9, 0xEE, 0xA0));
    }

    rect(12, 204, 376, 24, NAVY);
    if (rain) {
        for (int i = 0; i < 12; ++i) {
            const float x = static_cast<float>((i * 37 + static_cast<int>(time_ * 40.0f)) % 420 - 10);
            const float y = static_cast<float>((i * 23 + static_cast<int>(time_ * 90.0f)) % 150);
            C2D_DrawLine(x, y, WHITE, x - 5, y + 13, WHITE, 1.0f, 0.2f);
        }
    }

    // ---------- Bottom screen: map, message, actions ----------
    C2D_TargetClear(bottom_, C2D_Color32(0xE6, 0xF5, 0xF0, 0xFF));
    C2D_SceneBegin(bottom_);
    rect(0, 0, 320, 30, NAVY);
    rect(8, 36, 304, 98, MAP_EDGE);
    rect(14, 42, 292, 86, MAP);
    rect(8, 140, 304, 52, NAVY);
    rect(8, 198, 72, 30, BUTTON);
    rect(84, 198, 72, 30, BUTTON);
    rect(160, 198, 72, 30, BUTTON);
    rect(236, 198, 76, 30, BUTTON);

    // Map route and nodes.
    C2D_DrawLine(86, 90, SEA_DARK, 218, 70, SEA_DARK, 3.0f, 0.3f);
    C2D_DrawLine(218, 70, SEA_DARK, 246, 112, SEA_DARK, 3.0f, 0.3f);
    circle(86, 90, 11, SEA_DARK);
    circle(218, 70, 11, CREAM);
    circle(246, 112, 11, CREAM);
    if (!state.destination.empty()) {
        circle(state.destination == "OLD LAB" ? 218.0f : 246.0f,
            state.destination == "OLD LAB" ? 70.0f : 112.0f, 15, GOLD);
    }

    // ---------- Final text pass, always above every card ----------
    C2D_SceneBegin(top_);
    text("CAT DRIFT", 14, 6, 0.78f, WHITE);
    std::snprintf(line, sizeof(line), "BEEP %d", state.battery);
    text(line, 250, 6, 0.58f, WHITE);
    std::snprintf(line, sizeof(line), "DAY %d", state.day);
    text(line, 320, 6, 0.58f, GOLD);
    text("CAT IS LIVING...", 20, 47, 0.50f, MUTED);
    text(state.destination.empty() ? "FISHING" : "SAILING", 278, 103, 0.48f, WHITE);
    text("PLACE", 20, 207, 0.46f, GOLD);
    text(state.location.c_str(), 72, 207, 0.44f, WHITE);
    text(state.weather.c_str(), 190, 207, 0.44f, rain ? GOLD : WHITE);
    text(state.lostContact ? "LOST" : "ONLINE", 305, 207, 0.40f, state.lostContact ? GOLD : WHITE);

    C2D_SceneBegin(bottom_);
    text("SATELLITE MAP", 12, 6, 0.64f, WHITE);
    text("DRIFT SEA", 42, 100, 0.46f, WHITE);
    text("OLD LAB", 190, 53, 0.44f, INK);
    text("RUINS", 226, 115, 0.44f, INK);
    text(animal.c_str(), 16, 133, 0.40f, MUTED);
    text("BEEPER", 18, 145, 0.52f, GOLD);
    text(message.c_str(), 18, 163, 0.41f, WHITE);
    if (!state.lastCatch.empty()) {
        text("CATCH", 18, 179, 0.38f, GOLD);
        text(state.lastCatch.c_str(), 70, 179, 0.38f, WHITE);
    }
    text("A GO", 25, 204, 0.48f, WHITE);
    text("B SCAN", 90, 204, 0.45f, WHITE);
    text("X REST", 166, 204, 0.45f, WHITE);
    text("Y DAY", 251, 204, 0.45f, WHITE);
    text(saveOk ? "SAVE OK" : "SAVE ERROR", 220, 184, 0.36f, saveOk ? MUTED : GOLD);

    C3D_FrameEnd(0);
}

void Ui::shutdown() {
    if (textBuf_) C2D_TextBufDelete(textBuf_);
    if (catSheet_) C2D_SpriteSheetFree(catSheet_);
    if (boatSheet_) C2D_SpriteSheetFree(boatSheet_);
    if (rodSheet_) C2D_SpriteSheetFree(rodSheet_);
    if (fishSheet_) C2D_SpriteSheetFree(fishSheet_);
    if (cloudSheet_) C2D_SpriteSheetFree(cloudSheet_);
    if (gullSheet_) C2D_SpriteSheetFree(gullSheet_);
    C2D_Fini();
    C3D_Fini();
}

} // namespace catdrift
