AstroCommand – Virtual Space Station Command & Control System

A Software-Only IoT + AI Space Habitat Simulator

✅ 1. Introduction

AstroCommand is a virtual command and control system that simulates key subsystems of an off-world habitat such as the ISS, Lunar Gateway, or Mars station.
It integrates IoT telemetry, real-time messaging, cloud storage, React dashboards, and an AI reasoning engine (LangChain + Gemini).

The system monitors:

Oxygen, CO₂, humidity, temperature

Hull pressure, radiation

Solar power and battery levels

Crew vitals via wearable simulators

An AI agent analyzes telemetry, detects anomalies, and provides natural-language recommendations.

✅ 2. System Requirements
Software

Node.js v18+

npm / pnpm / yarn

Mosquitto MQTT Broker

Apache Kafka (optional, for event streaming)

Firebase CLI

InfluxDB 2.x

Git

Docker (optional)

Hardware

Minimum 4 GB RAM

Stable internet connection (for Firebase + Gemini)

✅ 3. Project Structure
AstroCommand/
│── sensors/               # Telemetry simulation scripts
│── mqtt-broker/           # Mosquitto configuration
│── kafka/                 # Kafka + Zookeeper setup
│── backend/               # API + AI reasoning engine
│── dashboard/             # React/Vite/Tailwind UI
│── database/              # Firestore + InfluxDB setup
└── README.md

✅ 4. Installation Steps
4.1 Clone the Repository
git clone <repo_url>
cd AstroCommand

4.2 Install MQTT Broker

macOS

brew install mosquitto
brew services start mosquitto


Ubuntu

sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto


Test:

mosquitto_sub -t test &
mosquitto_pub -t test -m "hello"

4.3 Install Kafka (Optional for full system)

Start Zookeeper:

bin/zookeeper-server-start.sh config/zookeeper.properties


Start Kafka:

bin/kafka-server-start.sh config/server.properties


Create telemetry topic:

bin/kafka-topics.sh --create --topic telemetry --bootstrap-server localhost:9092

4.4 Configure Firebase Firestore
firebase login
firebase init


Enable:

✅ Firestore

✅ Authentication

✅ Storage

Paste Firebase config inside:

dashboard/src/config/firebase.ts
backend/config/firebase.ts

4.5 Install InfluxDB

Using Docker:

docker run -p 8086:8086 influxdb:2.7


Create:

Bucket: astro_telemetry

Org: astrocommand

Token: INFLUX_TOKEN

Add to backend .env:

INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=xxxx
INFLUX_BUCKET=astro_telemetry
INFLUX_ORG=astrocommand

4.6 Install Backend
cd backend
npm install


Create .env:

GEMINI_API_KEY=your_key
MQTT_URL=mqtt://localhost:1883
KAFKA_BROKER=localhost:9092
FIREBASE_CREDENTIALS=./serviceAccount.json
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=xxxx


Start server:

npm run dev

4.7 Install Dashboard
cd dashboard
npm install
npm run dev


Open:
http://localhost:5173

4.8 Install Sensor Simulators
cd sensors
npm install
node simulate_o2.js
node simulate_temp.js
node simulate_power.js

✅ 5. Configuration
5.1 MQTT Topic Structure
Subsystem	Topic
Oxygen	life_support/o2
CO₂	life_support/co2
Temperature	environment/temperature
Humidity	environment/humidity
Radiation	environment/radiation
Solar Power	power/solar
Battery	power/battery
Crew Vitals	crew/vitals
5.2 Firestore Structure
life_support/
  └─ module
       └─ {o2, co2, temp, humidity, pressure}

power_data/
  └─ module
       └─ {solar, battery}

crew_vitals/
  └─ crew_id
       └─ {heart_rate, breathing, stress}

ai_logs/
  └─ {timestamp, parameter, message}

5.3 Dashboard Environment Variables

dashboard/.env:

VITE_MQTT_URL=ws://localhost:9001
VITE_FIREBASE_API_KEY=xxxx
VITE_BACKEND_URL=http://localhost:3000


Ensure WebSockets are enabled in mosquitto.conf.

✅ 6. Running the System

Run components in this order:

1. Start MQTT
mosquitto

2. Start Kafka (Optional)
bin/kafka-server-start.sh config/server.properties

3. Start InfluxDB
docker run -p 8086:8086 influxdb:2.7

4. Start Backend
cd backend
npm run dev

5. Start Dashboard
cd dashboard
npm run dev

6. Start Sensor Simulators
node sensors/simulate_all.js

7. (Optional) Run AI Engine
node backend/ai/engine.js

✅ 7. Usage Guide
7.1 Dashboard Features

The mission control dashboard allows you to:

Monitor real-time sensor data

View AI alerts

Access historical graphs

Chat with the AI mission assistant

Send manual commands

Replay scenarios

Switch between Commander/Engineer roles

7.2 AI Assistant Usage

Sample commands:

"Analyze oxygen drop over last 5 minutes"
"Predict battery depletion time"
"Simulate solar array failure"
"Show crew stress level trend"


The AI uses LangChain + Gemini for contextual reasoning.

7.3 Command Console

Available commands:

Command	Purpose
reroute_power(a → b)	Shift power between arrays
reboot_life_support(id)	Restart subsystem
activate_emergency()	Enable emergency mode
pause_ai()	Disable autonomous AI

All actions are logged.

7.4 Event Replay Mode

Replay historical events such as:

Oxygen depletion

CO₂ spike

Pressure leak

Radiation burst

Solar array degradation

✅ 8. Troubleshooting
Issue	Cause	Fix
Dashboard stuck at “Connecting…”	MQTT WebSockets disabled	Add listener 9001 in mosquitto.conf
AI not responding	Invalid Gemini key	Update .env
No telemetry	Wrong topic names	Verify simulator topics
Firebase writes fail	Incorrect rules	Update Firestore rules
Kafka not receiving	Topic not created	Recreate telemetry topic
✅ 9. Conclusion

AstroCommand demonstrates a complete virtual ecosystem for space station systems built using IoT, cloud services, and agentic AI. The layered design enables:

Real-time telemetry collection

Predictive analysis

Interactive mission control

Scenario-based testing

This system serves as a learning platform for life-support monitoring, power management, and intelligent automation.
