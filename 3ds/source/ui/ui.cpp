#include "ui.hpp"

#include <cmath>
#include <cstdio>
#include <string>

#include "cat-v2_t3x.h"
#include "boat-v2_t3x.h"
#include "rod-v2_t3x.h"
#include "fish-v2_t3x.h"
#include "cloud-v2_t3x.h"
#include "gull-v2_t3x.h"

namespace catdrift {
namespace {

const u32 NAVY = C2D_Color32(0x17, 0x27, 0x3D, 0xFF);
const u32 NAVY_2 = C2D_Color32(0x24, 0x3A, 0x52, 0xFF);
const u32 SKY = C2D_Color32(0xF2, 0xB9, 0x87, 0xFF);
const u32 WATER = C2D_Color32(0x3C, 0x9E, 0xB0, 0xFF);
const u32 DEEP_WATER = C2D_Color32(0x26, 0x6F, 0x87, 0xFF);
const u32 SEA_DARK = C2D_Color32(0x1D, 0x78, 0x9A, 0xFF);
const u32 MAP = C2D_Color32(0xC7, 0xD8, 0xC2, 0xFF);
const u32 MAP_EDGE = C2D_Color32(0x75, 0xA7, 0x9A, 0xFF);
const u32 CREAM = C2D_Color32(0xF3, 0xD5, 0x9B, 0xFF);
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
    catSheet_ = C2D_SpriteSheetLoadFromMem(cat_v2_t3x, cat_v2_t3x_size);
    boatSheet_ = C2D_SpriteSheetLoadFromMem(boat_v2_t3x, boat_v2_t3x_size);
    rodSheet_ = C2D_SpriteSheetLoadFromMem(rod_v2_t3x, rod_v2_t3x_size);
    fishSheet_ = C2D_SpriteSheetLoadFromMem(fish_v2_t3x, fish_v2_t3x_size);
    cloudSheet_ = C2D_SpriteSheetLoadFromMem(cloud_v2_t3x, cloud_v2_t3x_size);
    gullSheet_ = C2D_SpriteSheetLoadFromMem(gull_v2_t3x, gull_v2_t3x_size);
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
    if (message.size() > 30) message = message.substr(0, 27) + "...";
    std::string animal = state.animal.empty() ? "LINK: NONE" : "LINK: " + state.animal;

    time_ += 1.0f / 60.0f;
    const float wave = std::sin(time_ * 1.8f) * 2.5f;
    const float boatX = std::sin(time_ * 0.75f) * 2.5f;
    const float catY = std::sin(time_ * 1.5f) * 1.5f;
    const bool rain = state.weather == "RAIN";
    const bool fog = state.weather == "FOG";
    const u32 sky = rain ? C2D_Color32(0x6D, 0x83, 0x99, 0xFF) : fog ? C2D_Color32(0xA8, 0xB9, 0xB5, 0xFF) : SKY;

    C2D_TextBufClear(textBuf_);
    C3D_FrameBegin(C3D_FRAME_SYNCDRAW);

    // ---------- Top screen: a clean living diorama ----------
    C2D_TargetClear(top_, sky);
    C2D_SceneBegin(top_);
    rect(0, 0, 400, 32, NAVY);
    rect(0, 32, 400, 82, sky);
    rect(0, 114, 400, 76, WATER);
    rect(0, 157, 400, 33, DEEP_WATER);
    rect(0, 190, 400, 50, NAVY);
    rect(0, 188, 400, 3, GOLD);

    if (!rain && !fog) circle(354, 56, 13, GOLD);
    C2D_DrawImageAt(cloud_, 10, 43, 0.65f, nullptr, 0.11f, 0.11f);
    C2D_DrawImageAt(cloud_, 294, 40, 0.65f, nullptr, -0.10f, 0.10f);
    C2D_DrawImageAt(gull_, 315, 67 + wave, 0.66f, nullptr, 0.085f, 0.085f);
    C2D_DrawImageAt(boat_, 129 + boatX, 99 + wave, 0.68f, nullptr, 0.20f, 0.20f);
    C2D_DrawImageAt(cat_, 144 + boatX, 87 + wave + catY, 0.70f, nullptr, 0.105f, 0.105f);
    if (state.destination.empty())
        C2D_DrawImageAt(rod_, 223 + boatX, 81 + wave, 0.71f, nullptr, 0.075f, 0.075f);

    if (state.destination.empty()) {
        const float bobX = 285.0f + std::sin(time_ * 1.1f) * 4.0f;
        const float bobY = 164.0f + wave;
        C2D_DrawLine(248 + boatX, 108 + wave, WHITE, bobX, bobY, WHITE, 1.0f, 0.7f);
        C2D_DrawImageAt(fish_, bobX - 13.0f, bobY + 8.0f, 0.67f, nullptr, 0.04f, 0.04f);
        circle(bobX, bobY, 4, ORANGE);
        circle(bobX, bobY + 6, 10, C2D_Color32(0xA3, 0xE9, 0xEE, 0xA0));
    }

    rect(12, 197, 376, 33, NAVY_2);
    rect(18, 202, 3, 22, GOLD);
    if (rain) {
        for (int i = 0; i < 12; ++i) {
            const float x = static_cast<float>((i * 37 + static_cast<int>(time_ * 40.0f)) % 420 - 10);
            const float y = static_cast<float>((i * 23 + static_cast<int>(time_ * 90.0f)) % 150);
            C2D_DrawLine(x, y, WHITE, x - 5, y + 13, WHITE, 1.0f, 0.2f);
        }
    }

    // ---------- Bottom screen: navigation, beeper, actions ----------
    C2D_TargetClear(bottom_, C2D_Color32(0xE6, 0xF5, 0xF0, 0xFF));
    C2D_SceneBegin(bottom_);
    rect(0, 0, 320, 30, NAVY);
    rect(8, 36, 304, 92, MAP_EDGE);
    rect(13, 41, 294, 82, MAP);
    rect(8, 130, 304, 62, NAVY);
    rect(8, 198, 72, 30, BUTTON);
    rect(84, 198, 72, 30, BUTTON);
    rect(160, 198, 72, 30, BUTTON);
    rect(236, 198, 76, 30, BUTTON);

    // Map route and nodes.
    C2D_DrawLine(72, 91, SEA_DARK, 212, 64, SEA_DARK, 3.0f, 0.3f);
    C2D_DrawLine(212, 64, SEA_DARK, 260, 103, SEA_DARK, 3.0f, 0.3f);
    circle(72, 91, 9, SEA_DARK);
    circle(212, 64, 9, CREAM);
    circle(260, 103, 9, CREAM);
    if (!state.destination.empty()) {
        circle(state.destination == "OLD LAB" ? 212.0f : 260.0f,
            state.destination == "OLD LAB" ? 64.0f : 103.0f, 13, GOLD);
    }

    // ---------- Final text pass, always above every card ----------
    C2D_SceneBegin(top_);
    text("CAT DRIFT", 14, 6, 0.78f, WHITE);
    std::snprintf(line, sizeof(line), "BEEP %d", state.battery);
    text(line, 246, 6, 0.55f, WHITE);
    std::snprintf(line, sizeof(line), "DAY %d", state.day);
    text(line, 320, 6, 0.58f, GOLD);
    text("CAT IS LIVING...", 22, 47, 0.43f, MUTED);
    text(state.destination.empty() ? "FISHING" : "SAILING", 286, 92, 0.44f, WHITE);
    text("PLACE", 28, 203, 0.40f, GOLD);
    text(state.location.c_str(), 76, 203, 0.38f, WHITE);
    text(state.weather.c_str(), 216, 203, 0.38f, rain ? GOLD : WHITE);
    text(state.lostContact ? "LOST" : "ONLINE", 316, 203, 0.34f, state.lostContact ? GOLD : WHITE);

    C2D_SceneBegin(bottom_);
    text("SATELLITE MAP", 12, 6, 0.60f, WHITE);
    text("DRIFT SEA", 28, 98, 0.40f, WHITE);
    text("OLD LAB", 180, 52, 0.40f, INK);
    text("RUINS", 232, 106, 0.40f, INK);
    text(animal.c_str(), 16, 132, 0.36f, MAP_EDGE);
    text("BEEPER", 18, 142, 0.46f, GOLD);
    text(message.c_str(), 18, 159, 0.35f, WHITE);
    if (!state.lastCatch.empty()) {
        text("CATCH", 18, 177, 0.34f, GOLD);
        text(state.lastCatch.c_str(), 68, 177, 0.34f, WHITE);
    }
    text("A GO", 25, 204, 0.43f, WHITE);
    text("B SCAN", 90, 204, 0.40f, WHITE);
    text("X REST", 166, 204, 0.40f, WHITE);
    text("Y DAY", 251, 204, 0.40f, WHITE);
    text(saveOk ? "SAVED" : "SAVE ERROR", 220, 182, 0.30f, saveOk ? MUTED : GOLD);

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
