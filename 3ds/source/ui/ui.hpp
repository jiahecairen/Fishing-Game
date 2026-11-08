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
    void text(const char* value, float x, float y, float size, u32 color, u32 flags = 0);
};

} // namespace catdrift
