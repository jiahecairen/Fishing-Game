#include "game.hpp"

namespace catdrift {

Game::Game() : state_{1, 4, "DRIFT SEA", "", "CLEAR", "", "", CatMood::Calm,
    "BEEPER: This is Cat. I am alive. The sea is quiet.", false, 0}, idleSeconds_(0.0f) {}

const GameState& Game::state() const {
    return state_;
}

GameState& Game::mutableState() {
    return state_;
}

bool Game::tick(float seconds) {
    if (state_.lostContact) return false;
    idleSeconds_ += seconds;
    if (idleSeconds_ < 30.0f) return false;
    idleSeconds_ -= 30.0f;
    advanceDay();
    return true;
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
    if (destination == "SHALLOW RUINS" && state_.animal.empty()) {
        receive("BEEPER: No safe route. I need a guide for the shallow ruins." );
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
    if (state_.day >= 2 && state_.animal.empty()) {
        state_.animal = "GULL";
        receive("GULL: The old lab is north. Follow the cold current.");
        return;
    }
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
    const std::string oldWeather = state_.weather;
    if (state_.day % 6 == 0) state_.weather = "RAIN";
    else if (state_.day % 5 == 0) state_.weather = "FOG";
    else state_.weather = "CLEAR";
    if (state_.weather != oldWeather) {
        receive(state_.weather == "RAIN"
            ? "BEEPER: Rain is falling. The sea is getting darker."
            : state_.weather == "FOG"
                ? "BEEPER: Fog is covering the water. I can barely see the mast."
                : "BEEPER: The clouds opened. I can see the stars again.");
    }
    if (state_.travelDays > 0) {
        state_.travelDays--;
        if (state_.travelDays == 0 && !state_.destination.empty()) {
            state_.location = state_.destination;
            state_.destination.clear();
            state_.mood = CatMood::Curious;
            if (state_.location == "OLD LAB") {
                receive("BEEPER: I arrived. An old laboratory is under the water." );
            } else {
                receive("BEEPER: I arrived. There are warm lights beneath the ruins." );
            }
        }
    } else if (state_.mood == CatMood::Tired) {
        state_.mood = CatMood::Calm;
        receive("BEEPER: Good morning. I fixed the fishing rod." );
    } else if (state_.day % 3 == 0) {
        state_.lastCatch = "SILVER FISH";
        receive("BEEPER: I caught a silver fish. It was looking at the stars." );
    } else if (state_.day % 3 == 1) {
        state_.lastCatch = "JELLYFISH";
        receive("BEEPER: I caught a jellyfish. It glowed under the boat." );
    } else {
        state_.lastCatch = "SEA BOTTLE";
        receive("BEEPER: I found a bottle in the net. There is a map inside." );
    }
    if (state_.day >= 4 && state_.animal.empty()) {
        state_.animal = "GULL";
        receive("GULL: Your signal is strange, little boat. I can guide you north.");
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
