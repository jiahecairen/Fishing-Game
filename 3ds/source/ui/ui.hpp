#pragma once

#include <3ds.h>
#include <citro2d.h>

#include "game/game.hpp"

namespace catdrift {

class Ui {
public:
    Ui();
    bool init();
    void render(const GameState& state, bool saveOk);
    void shutdown();

private:
    C3D_RenderTarget* top_;
    C3D_RenderTarget* bottom_;
    C2D_TextBuf textBuf_;
    C2D_SpriteSheet catSheet_;
    C2D_SpriteSheet boatSheet_;
    C2D_SpriteSheet rodSheet_;
    C2D_SpriteSheet fishSheet_;
    C2D_SpriteSheet cloudSheet_;
    C2D_SpriteSheet gullSheet_;
    C2D_Image cat_;
    C2D_Image boat_;
    C2D_Image rod_;
    C2D_Image fish_;
    C2D_Image cloud_;
    C2D_Image gull_;
    float time_;
    void text(const char* value, float x, float y, float size, u32 color, u32 flags = 0);
};

} // namespace catdrift
