#include "game.hpp"

namespace catdrift {

Game::Game() : state_{1, 4, "DRIFT SEA", "", CatMood::Calm,
    "BEEPER: This is Cat. I am alive. The sea is quiet.", false, 0} {}

const GameState& Game::state() const {
    return state_;
}

void Game::receive(const std::string& message) {
    state_.message = message;
    state_.mood = CatMood::Curious;
}

void Game::sendInstruction(const std::string& destination) {
    if (state_.lostContact) {
        receive("BEEPER: No reply. Maybe wait a little longer." );
        return;
    }
    if (state_.battery <= 0) {
        receive("BEEPER: Battery empty. Wait for a power source." );
        return;
    }
    state_.battery--;
    state_.destination = destination;
    state_.travelDays = 2;
    state_.mood = CatMood::Worried;
    receive("BEEPER: Heading to " + destination + "." );
}

void Game::observe() {
    if (state_.battery <= 0) {
        receive("SAT: Offline. Not enough beeper power." );
        return;
    }
    state_.battery--;
    if (state_.location == "DRIFT SEA") {
        receive("SAT: Old lab reflection found, 2 days ahead." );
    } else {
        receive("SAT: Unknown shallow water below the clouds." );
    }
}

void Game::waitAndSavePower() {
    state_.mood = CatMood::Tired;
    receive("Cat stayed home, caught a fish, then fell asleep." );
}

void Game::advanceDay() {
    state_.day++;
    if (state_.travelDays > 0) {
        state_.travelDays--;
        if (state_.travelDays == 0 && !state_.destination.empty()) {
            state_.location = state_.destination;
            state_.destination.clear();
            state_.mood = CatMood::Curious;
            receive("BEEPER: I arrived. An old building is under the water." );
        }
    } else if (state_.mood == CatMood::Tired) {
        state_.mood = CatMood::Calm;
        receive("BEEPER: Good morning. I fixed the fishing rod." );
    }
    if (state_.day == 8 && state_.battery == 0) {
        state_.lostContact = true;
        receive("BEEPER: ...signal... cannot hear..." );
    }
}

const char* moodName(CatMood mood) {
    switch (mood) {
        case CatMood::Calm: return "CALM";
        case CatMood::Curious: return "CURIOUS";
        case CatMood::Tired: return "TIRED";
        case CatMood::Worried: return "WORRIED";
    }
    return "UNKNOWN";
}

} // namespace catdrift
