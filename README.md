# 🎬 WatchMate

WatchMate is a real-time watch-party web application that allows users to create and join rooms, watch YouTube videos together, chat with other participants, and synchronize video playback in real time.

## 🌐 Live Project

**Frontend:**  
https://watchmate-client.vercel.app

**Backend:**  
Deployed on Render

---

## 📌 About the Project

WatchMate provides a virtual watch-party experience where multiple users can watch the same YouTube video together in a shared room.

The application supports real-time video synchronization, chat, reactions, participant management, private rooms, join requests, role management, and host controls.

---

## ✨ Features

### 🔐 Authentication

- User Sign Up
- User Login
- JWT-based authentication
- Protected rooms
- Authenticated Socket.IO connections

### 🏠 Room Management

- Create watch rooms
- Unique room codes
- Join rooms using room codes
- Public rooms
- Private rooms
- Leave rooms
- Close rooms
- Live room status

### 🔒 Private Rooms

Private rooms use a host-approval system.

Flow:

```text
Participant
     ↓
Join Private Room
     ↓
Join Request
     ↓
Host
   ↙   ↘
Allow  Reject
  ↓
Room Access
The Host can:

View join requests
Approve users
Reject users
🎥 YouTube Watch Party

Users can watch YouTube videos together with synchronized playback.

Supported controls include:

Play
Pause
Seek
Change video
Current playback time synchronization

Playback flow:

Host
 ↓
Socket.IO
 ↓
Backend
 ↓
All Participants
💬 Real-Time Chat

Users can chat inside the room.

Messages contain:

Username
User ID
Message
Timestamp
😀 Reactions

Users can send real-time reactions to other participants.

👥 Participant Management

The room displays participants and their current roles.

Participant information includes:

Username
User ID
Role
Online status
👑 Host Controls

The Host can:

Control playback
Change YouTube video
Approve join requests
Reject join requests
Remove participants
Assign Moderator role
Change Moderator to Participant
Transfer Host ownership
Close the room
🛡️ Moderator

A Moderator can help manage the room according to the permissions assigned by the application.

🔄 Host Transfer

The Host can transfer ownership to another participant.

Current Host
     ↓
Transfer Host
     ↓
New Host

The previous Host becomes a Moderator.

🚫 Remove Participant

The Host can remove a participant from the room in real time.

⚡ Real-Time Communication

WatchMate uses Socket.IO for real-time communication.

Important real-time events include:

join_room
approve_join_request
reject_join_request

play
pause
seek
change_video

assign_role
remove_participant
transfer_host

send_message
send_reaction

leave_room
close_room

sync_state
room_state_updated
user_joined
user_left
video_changed

join_request_pending
join_request_approved
join_request_rejected

role_assigned
participant_removed
room_closed
🏗️ Technology Stack
Frontend
React
Vite
JavaScript
HTML
CSS
React Router
Socket.IO Client
Backend
Node.js
Express.js
Socket.IO
MongoDB
Mongoose
JWT
Database
MongoDB
Deployment
Frontend: Vercel
Backend: Render
Version Control
Git
GitHub
📂 Project Structure
watchmate/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Room.js
│   │   │
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │
│   │   ├── sockets/
│   │   │   ├── socketHandler.js
│   │   │   ├── roomRegistry.js
│   │   │   └── permissions.js
│   │   │
│   │   ├── utils/
│   │   │   └── youtube.js
│   │   │
│   │   └── server.js
│   │
│   └── package.json
│
├── README.md
└── .gitignore
🔄 Application Flow
                    WATCHMATE
                        │
             ┌──────────┴──────────┐
             ↓                     ↓
          Sign Up                Login
             │                     │
             └──────────┬──────────┘
                        ↓
                    Dashboard
                        │
               ┌────────┴────────┐
               ↓                 ↓
          Create Room         Join Room
               │                 │
               ↓                 ↓
             Host           Participant
               │
       ┌───────┴────────┐
       ↓                ↓
   Public Room      Private Room
                         │
                    Join Request
                         │
                    Host Approval
                         │
                    Enter Room
                         │
             ┌───────────┴───────────┐
             ↓                       ↓
          YouTube                  Chat
             │                       │
             ↓                       ↓
      Play / Pause / Seek      Messages / Reactions
             │
             ↓
       Real-Time Sync
🔐 Authentication Flow
User
 ↓
Sign Up / Login
 ↓
Backend
 ↓
JWT Token
 ↓
Frontend
 ↓
Authenticated API Requests
 ↓
Socket.IO Connection
 ↓
JWT Verification
 ↓
Room Access
🎬 YouTube Synchronization

When the Host changes the video:

Host enters YouTube URL
        ↓
YouTube Video ID extracted
        ↓
Backend validates the video
        ↓
video_changed event
        ↓
All participants
        ↓
Same video loaded

Playback synchronization:

PLAY
 ↓
Backend
 ↓
All Participants

PAUSE
 ↓
Backend
 ↓
All Participants

SEEK
 ↓
Backend
 ↓
All Participants
🗄️ Database

MongoDB is used for storing application data.

Main collections:

Users
Rooms
User

User data includes information such as:

name
email
password
phone
role
Room

Room data includes:

roomCode
name
host
participants
joinRequests
visibility
videoId
currentTime
playState
isLive
closedAt
createdAt
🔑 Environment Variables

Create a .env file inside the server folder.

Example:

PORT=5000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173

For production:

CLIENT_URL=https://watchmate-client.vercel.app

⚠️ Never upload the real .env file to GitHub.

Never expose:

MongoDB credentials
JWT secret
Passwords
API keys
Private credentials
🛠️ Installation
1. Clone Repository
git clone https://github.com/komal13154/watchmate.git
cd watchmate
💻 Frontend Setup
cd client

Install dependencies:

npm install

Start frontend:

npm run dev

Frontend normally runs on:

http://localhost:5173
🖥️ Backend Setup

Open another terminal:

cd server

Install dependencies:

npm install

Create the .env file and add your environment variables.

Start backend:

npm run dev

Backend normally runs on:

http://localhost:5000

Expected output:

MongoDB connected successfully
WatchMate backend running on http://localhost:5000
🔌 REST API and Socket.IO

WatchMate uses both REST APIs and Socket.IO.

REST API

REST APIs are used for:

Authentication
User operations
Room creation
Room information
Persistent database operations
Socket.IO

Socket.IO is used for:

Real-time playback
Chat
Reactions
Participant updates
Join requests
Role updates
Room events
🌐 Deployment
Frontend

The React/Vite frontend is deployed using Vercel.

Live frontend:

https://watchmate-client.vercel.app

Backend

The Node.js/Express backend is deployed using Render.

The frontend communicates with the production backend through the configured API URL.

🧪 Testing

The following areas were tested during development:

Authentication
Sign Up
Login
JWT authentication
Invalid authentication token
Protected room access
Rooms
Create room
Join room
Leave room
Close room
Public room
Private room
Private Rooms
Join request
Approve request
Reject request
Participant joining after approval
Playback
Play
Pause
Seek
Change video
Playback synchronization
Participants
Join
Leave
Remove participant
Assign Moderator
Transfer Host
Real-Time Features
Chat
Reactions
Participant updates
Room state updates
Join-request updates
📱 Responsive Design

WatchMate is designed for:

Desktop
Laptop
Tablet
Mobile

The interface provides access to the synchronized video, participant list, and chat.

🔮 Future Improvements

Possible future improvements include:

Better video synchronization
Voice/video calling
More reactions
User profile avatars
Typing indicators
Message history
Room passwords
Scheduled watch parties
Notifications
Dark mode
Watch history
Improved mobile UI
Better reconnect handling
Support for additional video platforms
🎯 Project Objective

The main objective of WatchMate is to build a real-time collaborative video watching platform where users can watch videos together and communicate through real-time chat.

This project demonstrates practical experience with:

Full-stack web development
React
Node.js
Express.js
MongoDB
REST APIs
JWT Authentication
Socket.IO
Real-time communication
Role-based authorization
Private-room access control
Git and GitHub
Vercel deployment
Render deployment
👩‍💻 Developer
Komal Jha

BCA Student | Web Developer

GitHub:

https://github.com/komal13154

⭐ Support

If you like this project, consider giving the repository a ⭐ on GitHub.
