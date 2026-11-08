#include "game.hpp"

namespace catdrift {

Game::Game() : state_{1, 4, "漂流海域", "", CatMood::Calm,
    "BB机：这里是小猫。我还活着。海面很安静。", false, 0} {}

const GameState& Game::state() const {
    return state_;
}

void Game::receive(const std::string& message) {
    state_.message = message;
    state_.mood = CatMood::Curious;
}

void Game::sendInstruction(const std::string& destination) {
    if (state_.lostContact) {
        receive("BB机：没有回应。也许应该再等一会儿。" );
        return;
    }
    if (state_.battery <= 0) {
        receive("BB机：电量耗尽。请等待猫找到新的电源。" );
        return;
    }
    state_.battery--;
    state_.destination = destination;
    state_.travelDays = 2;
    state_.mood = CatMood::Worried;
    receive("BB机：收到坐标。小猫开始向「" + destination + "」漂流。" );
}

void Game::observe() {
    if (state_.battery <= 0) {
        receive("卫星：无法连接。BB机电量不足。" );
        return;
    }
    state_.battery--;
    if (state_.location == "漂流海域") {
        receive("卫星：前方 2 日航程处发现旧科研站的反射信号。" );
    } else {
        receive("卫星：云层下方有一片陌生的浅海。" );
    }
}

void Game::waitAndSavePower() {
    state_.mood = CatMood::Tired;
    receive("小猫今天没有远航。它钓到了一条鱼，然后在船舱里睡着了。" );
}

void Game::advanceDay() {
    state_.day++;
    if (state_.travelDays > 0) {
        state_.travelDays--;
        if (state_.travelDays == 0 && !state_.destination.empty()) {
            state_.location = state_.destination;
            state_.destination.clear();
            state_.mood = CatMood::Curious;
            receive("BB机：我到了。这里有一座沉在水里的旧建筑。" );
        }
    } else if (state_.mood == CatMood::Tired) {
        state_.mood = CatMood::Calm;
        receive("BB机：早上好。我把鱼竿修好了。" );
    }
    if (state_.day == 8 && state_.battery == 0) {
        state_.lostContact = true;
        receive("BB机：……信号……听不清……" );
    }
}

const char* moodName(CatMood mood) {
    switch (mood) {
        case CatMood::Calm: return "平静";
        case CatMood::Curious: return "好奇";
        case CatMood::Tired: return "疲惫";
        case CatMood::Worried: return "不安";
    }
    return "未知";
}

} // namespace catdrift
