import time
from collections import defaultdict
import requests  # Pour l'envoi réel via API

# ---------- 1. Définition initiale des pièces et appareils ----------
rooms = {
    "cuisine": [
        {"device": "frigo", "power": 150, "state": "on"},
        {"device": "micro-onde", "power": 800, "state": "off"},
        {"device": "lave-vaisselle", "power": 1200, "state": "off"}
    ],
    "salon": [
        {"device": "TV", "power": 120, "state": "off"},
        {"device": "lumière", "power": 60, "state": "off"},
        {"device": "console", "power": 100, "state": "off"}
    ],
    "chambre_enfants": [
        {"device": "lumière", "power": 40, "state": "off"},
        {"device": "ordinateur", "power": 60, "state": "off"},
        {"device": "chauffage", "power": 1500, "state": "off"}
    ],
    "toilette": [
        {"device": "lumière", "power": 20, "state": "off"}
    ],
    "salle_de_bain": [
        {"device": "chauffe-eau", "power": 2000, "state": "off"},
        {"device": "lumière", "power": 30, "state": "off"},
        {"device": "miroir_lumineux", "power": 15, "state": "off"}
    ],
    "chambre_parent": [
        {"device": "lumière", "power": 40, "state": "off"},
        {"device": "chauffage", "power": 1500, "state": "off"},
        {"device": "téléphone", "power": 10, "state": "off"}
    ],
    "garage": [
        {"device": "congélateur", "power": 200, "state": "on"},
        {"device": "lumière", "power": 50, "state": "off"},
        {"device": "machine à laver", "power": 1000, "state": "off"}
    ]
}

# ---------- 2. Fonction de mise à jour des états selon l'heure et la saison ----------
def toggle_devices_by_hour(rooms, hour, season):
    for room_name, devices in rooms.items():
        for device in devices:
            name = device["device"]
            if room_name == "cuisine":
                device["state"] = "on" if name == "frigo" else (
                    "on" if (name == "micro-onde" and hour == 12) or (name == "lave-vaisselle" and 20 <= hour <= 21) else "off")
            elif room_name == "salon":
                if name == "TV":
                    device["state"] = "on" if 18 <= hour <= 22 else "off"
                elif name == "lumière":
                    device["state"] = "on" if hour >= 19 or hour <= 6 else "off"
                elif name == "console":
                    device["state"] = "on" if 20 <= hour <= 22 else "off"
            elif room_name == "chambre_enfants":
                if name == "lumière":
                    device["state"] = "on" if 19 <= hour <= 22 else "off"
                elif name == "ordinateur":
                    device["state"] = "on" if 17 <= hour <= 20 else "off"
                elif name == "chauffage":
                    device["state"] = "on" if season == "hiver" and (6 <= hour <= 7 or 20 <= hour <= 22) else "off"
            elif room_name == "toilette":
                device["state"] = "on" if 6 <= hour <= 8 or 18 <= hour <= 22 else "off"
            elif room_name == "salle_de_bain":
                if name == "chauffe-eau":
                    device["state"] = "on" if season in ["hiver", "automne"] and 6 <= hour <= 7 else "off"
                elif name == "lumière":
                    device["state"] = "on" if 6 <= hour <= 8 or 18 <= hour <= 22 else "off"
                elif name == "miroir_lumineux":
                    device["state"] = "on" if hour == 7 else "off"
            elif room_name == "chambre_parent":
                if name == "lumière":
                    device["state"] = "on" if 20 <= hour <= 23 or hour == 0 else "off"
                elif name == "chauffage":
                    device["state"] = "on" if season == "hiver" and (5 <= hour <= 7 or 22 <= hour <= 23 or hour == 0) else "off"
                elif name == "téléphone":
                    device["state"] = "on" if hour >= 22 or hour <= 6 else "off"
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
    for devices in rooms.values():
        for device in devices:
            if device["state"] == "on":
                total += device["power"]
    return total

# ---------- 4. Consommation par pièce ----------
def get_power_by_room(rooms):
    summary = {}
    for room, devices in rooms.items():
        room_total = sum(d["power"] for d in devices if d["state"] == "on")
        summary[room] = room_total
    return summary

# ---------- 5. Consommation par appareil ----------
def accumulate_device_usage(device_usage, rooms):
    for devices in rooms.values():
        for device in devices:
            if device["state"] == "on":
                device_usage[device["device"]] += device["power"]
    return device_usage

# ---------- 6. Envoi simulé à Nexa ----------
def send_power_to_nexa(total_power, hour, rooms, room_powers, device_usage):
    print(f"[{hour:02d}h] ➜ Current consumption: {total_power} W (sent to Nexa)")
    
    try:
        # Building the response to send
        payload = {
            "hour": hour,
            "total_power": total_power,
            "room_power": room_powers,
            "rooms": rooms,
            "device_usage": device_usage  # Adding device usage data for the backend
        }
        
        response = requests.post("http://localhost:8080/simulation", json=payload)
        if response.status_code == 200:
            print("   ✅ Data sent to Nexa (VS Code)")
        else:
            print(f"   ⚠️ Sending failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ Error while sending to Nexa: {e}")

# ---------- 7. Simulation multi-jours ----------
season = "hiver"
jours_simulation = 4
device_usage = defaultdict(int)
delay_per_hour = 1.0  # ← adjust this (seconds delay between simulated hours)

for day in range(1, jours_simulation + 1):
    print(f"\n📅 Day {day}")
    for hour in range(24):
        rooms = toggle_devices_by_hour(rooms, hour, season)
        power = simulate_power_usage(rooms)
        room_powers = get_power_by_room(rooms)
        device_usage = accumulate_device_usage(device_usage, rooms)

        # Sending data to Nexa
        send_power_to_nexa(power, hour, rooms, room_powers, device_usage)

        print("   🔎 Power by room:", room_powers)
        time.sleep(delay_per_hour)  # ← configurable delay between hours

    print(f"\n📊 Day {day} Summary: Cumulative device power usage:")
    for dev, total in sorted(device_usage.items(), key=lambda x: -x[1]):
        print(f"   {dev:20s} : {total} W")
from flask import Flask, request, jsonify
from threading import Thread

app = Flask(__name__)

@app.route('/simulate', methods=['POST'])
def simulate_endpoint():
    data = request.get_json()
    req_type = data.get("type")
    room = data.get("room", "").lower()
    device = data.get("device", "").lower()

    if req_type == "status":
        if room and device:
            for d in rooms.get(room, []):
                if d["device"].lower() == device:
                    return jsonify(response={"data": {
                        "room": room,
                        "device": d["device"],
                        "usage": d["power"] if d["state"] == "on" else 0,
                        "unit": "W"
                    }})
        elif room:
            room_data = rooms.get(room)
            if room_data:
                return jsonify(response={"data": {
                    "room": room,
                    "devices": [
                        {
                            "device": d["device"],
                            "usage": d["power"] if d["state"] == "on" else 0,
                            "unit": "W"
                        } for d in room_data
                    ]
                }})
        elif device:
            for r, devices in rooms.items():
                for d in devices:
                    if d["device"].lower() == device:
                        return jsonify(response={"data": {
                            "room": r,
                            "device": d["device"],
                            "usage": d["power"] if d["state"] == "on" else 0,
                            "unit": "W"
                        }})
    return jsonify(response={"data": None})

# Run Flask app in a background thread
def run_flask():
    app.run(port=5000)

flask_thread = Thread(target=run_flask)
flask_thread.daemon = True
flask_thread.start()
