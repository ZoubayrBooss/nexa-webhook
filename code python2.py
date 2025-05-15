from flask import Flask, request, jsonify
from threading import Thread
from flask_cors import CORS
import requests
import time
from collections import defaultdict
import random

# Constants
ANOMALY_PROBABILITY = 0.02  # 2%

# ---------- 1. Définition initiale des pièces et appareils ----------
rooms = {
    "cuisine": [
        {"device": "frigo", "power": 150, "standby_power": 5, "state": "on"},
        {"device": "micro-onde", "power": 800, "standby_power": 3, "state": "off"},
        {"device": "lave-vaisselle", "power": 1200, "standby_power": 4, "state": "off"}
    ],
    "salon": [
        {"device": "TV", "power": 120, "standby_power": 8, "state": "off"},
        {"device": "lumière", "power": 60, "standby_power": 1, "state": "off"},
        {"device": "console", "power": 100, "standby_power": 6, "state": "off"}
    ],
    "chambre_enfants": [
        {"device": "lumière", "power": 40, "standby_power": 1, "state": "off"},
        {"device": "ordinateur", "power": 60, "standby_power": 10, "state": "off"},
        {"device": "chauffage", "power": 1500, "standby_power": 0, "state": "off"}
    ],
    "toilette": [
        {"device": "lumière", "power": 20, "standby_power": 1, "state": "off"}
    ],
    "salle_de_bain": [
        {"device": "chauffe-eau", "power": 2000, "standby_power": 5, "state": "off"},
        {"device": "lumière", "power": 30, "standby_power": 1, "state": "off"},
        {"device": "miroir_lumineux", "power": 15, "standby_power": 1, "state": "off"}
    ],
    "chambre_parent": [
        {"device": "lumière", "power": 40, "standby_power": 1, "state": "off"},
        {"device": "chauffage", "power": 1500, "standby_power": 0, "state": "off"},
        {"device": "téléphone", "power": 10, "standby_power": 1, "state": "off"}
    ],
    "garage": [
        {"device": "congélateur", "power": 200, "standby_power": 5, "state": "on"},
        {"device": "lumière", "power": 50, "standby_power": 1, "state": "off"},
        {"device": "machine à laver", "power": 1000, "standby_power": 4, "state": "off"}
    ]
}

# ---------- 2. Fonction de mise à jour des états selon l'heure et la saison ----------
def toggle_devices_by_hour(rooms, hour, season):
    for room_name, devices in rooms.items():
        for device in devices:
            name = device["device"]

            # cuisine
            if room_name == "cuisine":
                if name == "frigo":
                    device["state"] = "on"
                elif name == "micro-onde":
                    device["state"] = "on" if (hour == 12 and random.random() < 0.7) else "off"
                elif name == "lave-vaisselle":
                    device["state"] = "on" if (20 <= hour <= 21 and random.random() < 0.6) else "off"

            # salon
            elif room_name == "salon":
                if name == "TV":
                    device["state"] = "on" if (18 <= hour <= 22 and random.random() < 0.8) else "off"
                elif name == "lumière":
                    device["state"] = "on" if (hour >= 19 or hour <= 6) and (random.random() < 0.9) else "off"
                elif name == "console":
                    device["state"] = "on" if (20 <= hour <= 22 and random.random() < 0.5) else "off"

            # chambre_enfants
            elif room_name == "chambre_enfants":
                if name == "lumière":
                    device["state"] = "on" if (19 <= hour <= 22 and random.random() < 0.75) else "off"
                elif name == "ordinateur":
                    device["state"] = "on" if (17 <= hour <= 20 and random.random() < 0.65) else "off"
                elif name == "chauffage":
                    device["state"] = "on" if season == "hiver" and (6 <= hour <= 7 or 20 <= hour <= 22) else "off"

            # toilette
            elif room_name == "toilette":
                device["state"] = "on" if ((6 <= hour <= 8 or 18 <= hour <= 22) and random.random() < 0.8) else "off"

            # salle_de_bain
            elif room_name == "salle_de_bain":
                if name == "chauffe-eau":
                    device["state"] = "on" if season in ["hiver", "automne"] and 6 <= hour <= 7 else "off"
                elif name == "lumière":
                    device["state"] = "on" if (6 <= hour <= 8 or 18 <= hour <= 22) else "off"
                elif name == "miroir_lumineux":
                    device["state"] = "on" if hour == 7 else "off"

            # chambre_parent
            elif room_name == "chambre_parent":
                if name == "lumière":
                    device["state"] = "on" if 20 <= hour <= 23 or hour == 0 else "off"
                elif name == "chauffage":
                    device["state"] = "on" if season == "hiver" and (5 <= hour <= 7 or 22 <= hour <= 23 or hour == 0) else "off"
                elif name == "téléphone":
                    device["state"] = "on" if hour >= 22 or hour <= 6 else "off"

            # garage
            elif room_name == "garage":
                if name == "congélateur":
                    device["state"] = "on"
                elif name == "lumière":
                    device["state"] = "on" if 6 <= hour <= 8 or 18 <= hour <= 20 else "off"
                elif name == "machine à laver":
                    device["state"] = "on" if (season != "été" and 14 <= hour <= 15) or (season == "été" and 10 <= hour <= 11) else "off"

    return rooms

# ---------- 3. Consommation totale ----------
def simulate_power_usage(rooms):
    total = 0
    anomalies = 0
    total_devices = 0

    for devices in rooms.values():
        for device in devices:
            total_devices += 1

            # Base power consumption depending on state
            base_power = device["power"] if device["state"] == "on" else device.get("standby_power", 0)

            # Check if anomaly occurs
            if random.random() < ANOMALY_PROBABILITY:
                anomalies += 1
                anomaly_factor = random.uniform(0.8, 1.2)  # +/- 20% variation
                power_with_anomaly = base_power * anomaly_factor
                total += power_with_anomaly
            else:
                total += base_power

    anomaly_rate = anomalies / total_devices if total_devices else 0
    return total, anomaly_rate

# ---------- 4. Consommation par pièce ----------
def get_power_by_room(rooms):
    summary = {}
    for room, devices in rooms.items():
        room_total = 0
        for d in devices:
            base_power = d["power"] if d["state"] == "on" else d.get("standby_power", 0)
            if random.random() < ANOMALY_PROBABILITY:
                anomaly_factor = random.uniform(0.8, 1.2)
                room_total += base_power * anomaly_factor
            else:
                room_total += base_power
        summary[room] = room_total
    return summary

# ---------- 5. Consommation par appareil ----------
def accumulate_device_usage(device_usage, rooms):
    for devices in rooms.values():
        for device in devices:
            base_power = device["power"] if device["state"] == "on" else device.get("standby_power", 0)
            if random.random() < ANOMALY_PROBABILITY:
                anomaly_factor = random.uniform(0.8, 1.2)
                device_usage[device["device"]] += base_power * anomaly_factor
            else:
                device_usage[device["device"]] += base_power
    return device_usage
# ---------- 6. Energy Saving Recommendations ----------

def generate_energy_saving_recommendations(rooms, device_usage):
    recommendations = []

    # Example rule 1: Lights on during daytime (assume daytime 7h to 19h)
    for room, devices in rooms.items():
        for device in devices:
            if 'lumière' in device['device'].lower() and device['state'] == 'on':
                # If lights are on during daytime hours (let's say hour is available)
                # We don't have hour here, so let's recommend if usage is high in general
                if device_usage[device['device']] > 1000:  # arbitrary threshold, adjust as needed
                    recommendations.append(
                        f"Consider turning off the lights in the {room} when not needed during the day."
                    )

    # Example rule 2: High standby consumption (standby > 10W)
    for room, devices in rooms.items():
        for device in devices:
            if device.get('state') == 'standby' and device['power'] > 10:
                recommendations.append(
                    f"The device {device['device']} in {room} consumes high standby power. Consider unplugging or using smart plugs."
                )

    # Example rule 3: Heating running during uncommon hours
    # For demo, suggest turning heating off if it ran more than 4 hours (simplified)
    heating_usage = sum(power for dev, power in device_usage.items() if 'chauffage' in dev.lower())
    if heating_usage > 4000:  # threshold depends on your scale and simulation duration
        recommendations.append(
            "Your heating seems to be running a lot. Consider optimizing heating schedules to save energy."
        )

    # If no recommendations found
    if not recommendations:
        recommendations.append("All devices are used efficiently. No immediate energy saving suggestions.")

    return recommendations

# ---------- 7. Envoi simulé à Nexa ----------
def send_power_to_nexa(total_power, anomaly_rate, hour, rooms, room_powers, device_usage, recommendations=None):
    print(f"[{hour:02d}h] ➜ Current consumption: {total_power:.2f} W, Anomaly rate: {anomaly_rate*100:.2f}% (sent to Nexa)")
    try:
        payload = {
            "hour": hour,
            "total_power": total_power,
            "anomaly_rate": anomaly_rate,
            "room_power": room_powers,
            "rooms": rooms,
            "device_usage": device_usage
        }
        
        if recommendations is not None:
            payload["energy_saving_recommendations"] = recommendations

        response = requests.post("http://localhost:8080/simulation", json=payload)
        if response.status_code == 200:
            print("   ✅ Data sent to Nexa (VS Code)")
        else:
            print(f"   ⚠️ Sending failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ Error while sending to Nexa: {e}")


# ---------- 8. Simulation multi-jours ----------
season = "hiver"
jours_simulation = 1
device_usage = defaultdict(int)
delay_per_hour = 0.2

app = Flask(__name__)

def run_flask():
    print("🚀 Starting Flask server...")
    CORS(app)
    app.run(host='0.0.0.0', port=5000)

flask_thread = Thread(target=run_flask)
flask_thread.daemon = True
flask_thread.start()
time.sleep(1)

for day in range(1, jours_simulation + 1):
    print(f"\n📅 Day {day}")
    for hour in range(24):
        rooms = toggle_devices_by_hour(rooms, hour, season)
        total_power, anomaly_rate = simulate_power_usage(rooms)
        room_powers = get_power_by_room(rooms)
        device_usage = accumulate_device_usage(device_usage, rooms)

        recommendations = generate_energy_saving_recommendations(rooms, device_usage)

        send_power_to_nexa(total_power, anomaly_rate, hour, rooms, room_powers, device_usage, recommendations)

        print("   🔎 Power by room:", {k: round(v, 2) for k, v in room_powers.items()})
        print(f"   ⚠️ Anomaly rate: {anomaly_rate:.3f}%")
        time.sleep(delay_per_hour)

    print(f"\n📊 Day {day} Summary: Cumulative device power usage:")
    for dev, total in sorted(device_usage.items(), key=lambda x: -x[1]):
        print(f"   {dev:20s} : {total:.2f} W")
