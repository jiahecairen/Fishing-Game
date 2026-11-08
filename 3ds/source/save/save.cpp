#include "save.hpp"

#include <cstdio>
#include <cstdlib>
#include <string>

namespace catdrift {
namespace {

const char* SAVE_PATH = "sdmc:/3ds/cat-drift-save.txt";

bool readLine(FILE* file, std::string& out) {
    char buffer[512];
    if (!std::fgets(buffer, sizeof(buffer), file)) return false;
    out = buffer;
    while (!out.empty() && (out[out.size() - 1] == '\n' || out[out.size() - 1] == '\r')) {
        out.erase(out.size() - 1);
    }
    return true;
}

} // namespace

bool Save::load(GameState& state) {
    FILE* file = std::fopen(SAVE_PATH, "r");
    if (!file) return false;

    std::string line;
    bool ok = readLine(file, line);
    if (ok) state.day = std::atoi(line.c_str());
    ok = ok && readLine(file, line);
    if (ok) state.battery = std::atoi(line.c_str());
    ok = ok && readLine(file, state.location);
    ok = ok && readLine(file, state.destination);
    ok = ok && readLine(file, line);
    if (ok) state.mood = static_cast<CatMood>(std::atoi(line.c_str()));
    ok = ok && readLine(file, state.message);
    ok = ok && readLine(file, line);
    if (ok) state.lostContact = std::atoi(line.c_str()) != 0;
    ok = ok && readLine(file, line);
    if (ok) state.travelDays = std::atoi(line.c_str());
    if (readLine(file, line)) state.weather = line;
    if (state.weather.empty()) state.weather = "CLEAR";
    std::fclose(file);
    return ok;
}

bool Save::write(const GameState& state) {
    FILE* file = std::fopen(SAVE_PATH, "w");
    if (!file) return false;
    std::fprintf(file, "%d\n%d\n%s\n%s\n%d\n%s\n%d\n%d\n",
        state.day,
        state.battery,
        state.location.c_str(),
        state.destination.c_str(),
        static_cast<int>(state.mood),
        state.message.c_str(),
        state.lostContact ? 1 : 0,
        state.travelDays);
    std::fprintf(file, "%s\n", state.weather.c_str());
    const bool ok = std::fclose(file) == 0;
    return ok;
}

} // namespace catdrift
