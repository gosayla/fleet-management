import urllib.request, ssl, json, time, http.cookiejar, datetime

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=ctx),
    urllib.request.HTTPCookieProcessor(jar)
)

BASE = "https://gps.smarttrackerpro.net"

# 1. Login
login_req = urllib.request.Request(
    f"{BASE}/backend/ax/user/login.php",
    data=b"username=sharifest321&password=Aa123456",
    headers={"Content-Type": "application/x-www-form-urlencoded", "Referer": BASE + "/"}
)
login_resp = json.loads(opener.open(login_req, timeout=15).read().decode())
print("Logged in as:", login_resp.get("name"), "| account_id:", login_resp.get("account_id"))
print()

# 2. Get all vehicles
ts = int(time.time())
data_req = urllib.request.Request(
    f"{BASE}/backend/ax/current_data.php",
    data=f"unixtimestamp={ts}&user_id=0&c=3&n=".encode(),
    headers={"Content-Type": "application/x-www-form-urlencoded", "Referer": BASE + "/"}
)
data = json.loads(opener.open(data_req, timeout=15).read().decode())
vehicles = data["objects"]
print(f"Total vehicles: {len(vehicles)}")
print("-" * 100)

results = []

for v in vehicles:
    vid = v["id"]
    track_req = urllib.request.Request(
        f"{BASE}/backend/ax/current_track.php",
        data=f"agent_id={vid}&pass=0".encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Referer": BASE + "/"}
    )
    try:
        track = json.loads(opener.open(track_req, timeout=10).read().decode())
    except Exception as e:
        track = {}

    last_ts = datetime.datetime.fromtimestamp(v["unixtimestamp"]).strftime("%Y-%m-%d %H:%M") if v["unixtimestamp"] else "N/A"

    row = {
        "id": vid,
        "plate": v["name"].strip(),
        "active": v["active"],
        "last_seen": last_ts,
        "lat": track.get("lat", v["lat"]),
        "lon": track.get("lon", v["lon"]),
        "speed": track.get("speed", v.get("last_event", {}).get("speed", 0)),
        "ignition": track.get("ignition"),
        "mileage_km": track.get("mileage") or track.get("odometer"),
        "engine_hours": track.get("engine_hours") or v.get("motor_hours"),
        "battery_v": track.get("ext_power_voltage") or track.get("battery"),
        "load_weight": track.get("fuel_level"),  # some providers map weight here
        "last_stop": track.get("park_start_time"),
        "last_move": track.get("last_move_time"),
        "status": v.get("last_event", {}).get("text", ""),
    }
    results.append(row)

    ign_str = "ON" if row["ignition"] else ("OFF" if row["ignition"] is not None else "?")
    print(
        f"[{vid:7}]  {row['plate']:<18}  active:{row['active']}  ign:{ign_str:<4}  "
        f"speed:{row['speed']:>4} km/h  lat:{row['lat']:.5f}  lon:{row['lon']:.5f}  "
        f"mileage:{row['mileage_km']}  eng_h:{row['engine_hours']}  last:{row['last_seen']}  status:{row['status']}"
    )

print()
print("Full JSON saved to gps_data.json")
with open("gps_data.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
