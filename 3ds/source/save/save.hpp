#pragma once

#include "game/game.hpp"

namespace catdrift {

class Save {
public:
    static bool load(GameState& state);
    static bool write(const GameState& state);
};

} // namespace catdrift
