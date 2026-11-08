#pragma once

#include <string>

namespace catdrift {

enum class CatMood {
    Calm,
    Curious,
    Tired,
    Worried,
};

struct GameState {
    int day;
    int battery;
    std::string location;
    std::string destination;
    CatMood mood;
    std::string message;
    bool lostContact;
    int travelDays;
};

class Game {
public:
    Game();

    const GameState& state() const;
    GameState& mutableState();
    void sendInstruction(const std::string& destination);
    void observe();
    void waitAndSavePower();
    void advanceDay();

private:
    GameState state_;
    void receive(const std::string& message);
};

const char* moodName(CatMood mood);

} // namespace catdrift
