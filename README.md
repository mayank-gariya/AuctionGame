
<div align="center">

  <h1>🔨 AuctionGame</h1>

  <h3>Real-Time • Room-Based • Live Auction Platform</h3>

  <p>
    A real-time auction application where users can create rooms,
    manage auction items, participate in live bidding, and experience
    instant auction updates.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
    <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
    <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  </p>

  <br/>

  <table>
    <tr>
      <td align="center">🏠<br/><b>Room Management</b><br/>Create and join auction rooms</td>
      <td align="center">⚡<br/><b>Live Bidding</b><br/>Instant bid updates</td>
      <td align="center">📦<br/><b>Auction Queue</b><br/>Manage auction items</td>
    </tr>
  </table>

</div>

---

## 📌 About The Project

**AuctionGame** is a real-time, room-based auction application
built using Node.js, Express, MongoDB, Socket.IO, JavaScript,
and TypeScript.

The platform allows a host to create an auction room, add items
to an auction queue, and manage live bidding sessions.

Participants can join rooms, place bids on the currently active
item, and receive real-time updates about bids and auction events
without refreshing the page.

## ✨ Key Features

- 🏠 **Room Creation:** Hosts can create and manage auction rooms.
- 👥 **Room Participation:** Users can join existing auction rooms.
- 📦 **Auction Queue:** Add and organize items for auction.
- 🔨 **Live Bidding:** Participants can place bids on active items.
- ⚡ **Real-Time Updates:** Instant bid and auction updates using Socket.IO.
- 🎯 **Auction Management:** Hosts can control the active auction session.

## 🛠️ Tech Stack

| Technology | Purpose |
|:---|:---|
| Node.js | Backend runtime |
| Express.js | REST API and server |
| MongoDB | Database |
| Socket.IO | Real-time communication |
| JavaScript | Application logic |
| TypeScript | Type-safe development |

<div align="center">

  <h3>🚀 Built for Real-Time Auction Experiences</h3>

  <p><i>Bid • Compete • Win</i></p>

</div>

## Features

-   **User authentication** with access-token-based API requests.
-   **Auction rooms** created and managed by a host.
-   **Room participants** with host and bidder roles.
-   **Item queue** with item title, description, seller, and starting
    price.
-   **Live bidding** through Socket.IO.
-   **Bid validation** so a new bid must be higher than the current bid.
-   **Host controls** to start, pause, resume, and close the current
    item.
-   **Automatic auction timer** managed by the server.
-   **Pause and resume** support, retaining the remaining time while the
    server stays running.
-   **Automatic result handling** when the timer expires:
    -   Item is marked **sold** when a valid highest bidder exists.
    -   Item is marked **unsold** when no valid bid exists.
-   **Next-item selection** by the host.
-   **Live participant, queue, bid, and result updates** for connected
    users.

## Tech stack

  Area                      Technology
  ------------------------- -----------------------------------
  Backend                   Node.js, Express, TypeScript
  Database                  MongoDB, Mongoose
  Real-time communication   Socket.IO
  Frontend                  HTML, CSS, vanilla JavaScript
  Styling                   Tailwind CSS
  Authentication            Access-token-based authentication

## Project structure

The exact folder layout may vary, but the application is organized
around these responsibilities:

``` text
AuctionGame/
├── public/
│   ├── room.html
│   ├── js/
│   │   ├── main.js
│   │   └── room.js
│   └── ...
├── src/
│   ├── controllers/
│   │   └── auction.controller.ts
│   ├── models/
│   │   └── room.model.ts
│   ├── routes/
│   │   └── auction.routes.ts
│   ├── sockets/
│   │   └── auction.socket.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── types/
│       └── auction.ts
├── .env
├── .gitignore
└── package.json
```

## Getting started

### Prerequisites

-   Node.js and npm
-   A MongoDB database (local MongoDB or MongoDB Atlas)
-   A Git client

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd AuctionGame
```

### 2. Install dependencies

``` bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend project root. Add the variables
required by your application configuration.

For example, the project will need a MongoDB connection string and the
secrets/configuration used by its authentication implementation:

``` env
MONGO_URI=<your-mongodb-connection-string>
ACCESS_TOKEN_SECRET=<your-access-token-secret>
REFRESH_TOKEN_SECRET=<your-refresh-token-secret>
PORT=8000
```

**Important:** Environment-variable names must match the names read by
your actual configuration code. If your project uses different names,
use those names instead. Never commit real secrets or database
credentials.

### 4. Start the backend

Run the development or start command defined in the `scripts` section of
`package.json`.

For example, if your project defines a `dev` script:

``` bash
npm run dev
```

The frontend currently expects the API at:

``` text
http://localhost:8000/api
```

and the Socket.IO server at:

``` text
http://localhost:8000
```

If you change the backend host or port, update the corresponding
frontend URLs as well.

### 5. Open the application

Serve the frontend through the static-file setup configured by the
backend, or use the local frontend workflow configured for your project.
Open the application's entry page in your browser, sign in, create a
room, and join it from another browser session to test host and bidder
behavior.

## How an auction works

<img width="1340" height="619" alt="image" src="https://github.com/user-attachments/assets/816d7f28-5df6-4edd-8552-0eb99a6b622b" />
1.  A user signs in and creates an auction room.
2.  The room creator becomes the host.
3.  Other users join the room as participants.
4.  The host adds items to the queue.
5.  The host starts the selected item. The server starts the bidding
    timer.
6.  Participants submit bids. Each bid must be greater than the current
    bid or starting price.
7.  When the timer expires, the server marks the item as sold or unsold
    and broadcasts the result.
8.  The host selects the next pending item and starts another round.

### Item statuses

  -----------------------------------------------------------------------
  Status                              Meaning
  ----------------------------------- -----------------------------------
  `pending`                           Item is waiting to start, or a
                                      running item has been paused

  `active`                            Bidding is open

  `sold`                              The item finished with a highest
                                      bidder

  `unsold`                            The item finished without a valid
                                      bid, or the host closed it
  -----------------------------------------------------------------------

The application uses `pending` for the paused state; the model does not
define a separate `paused` status.

### Room statuses

  Status      Meaning
  ----------- -------------------------
  `waiting`   Auction has not started
  `live`      Auction has started
  `ended`     Room auction has ended

## Real-time events

The frontend and Socket.IO backend communicate using events including:

<img width="1136" height="700" alt="image" src="https://github.com/user-attachments/assets/59229627-53f4-4d7f-90c8-c50cdbb7bca7" />


  -----------------------------------------------------------------------
  Event                               Purpose
  ----------------------------------- -----------------------------------
  `join-auction`                      Join a room's live auction channel

  `user_joined_broadcast`             Notify participants when someone
                                      joins

  `user_left_broadcast`               Notify participants when someone
                                      leaves

  `place-bid`                         Submit a bid

  `bid_update`                        Broadcast an accepted bid

  `bid_rejected`                      Report a rejected bid

  `item_status_update`                Host starts, pauses, resumes, or
                                      closes an item

  `auction_timer_start`               Send the item ID and server timer
                                      timestamps

  `auction_timer_end`                 Notify clients that the timer has
                                      ended

  `queue_updated`                     Notify clients that auction item
                                      state has changed

  `next-auction-item`                 Ask the server to select the next
                                      pending item

  `next_item_selected`                Confirm the next item selection

  `next_item_rejected`                Report why next-item selection
                                      failed

  `auction_winner`                    Broadcast the completed item's
                                      winner and winning bid
  -----------------------------------------------------------------------

The exact event payloads are defined in the Socket.IO implementation and
should remain consistent between the frontend and backend.

## Important implementation notes

-   The server is responsible for the auction countdown and final
    sold/unsold decision. The browser countdown is a display
    synchronized using the server timestamps.
-   The current timer implementation stores active timer handles and
    remaining time in server memory. **Restarting the backend process
    will lose in-progress timer state.** Persistent timer recovery would
    require storing the deadline/remaining time in MongoDB.
-   For production deployment, configure the frontend API and Socket.IO
    URLs for the deployed backend instead of `localhost`.
-   Socket identity and room membership should be validated on the
    server. Do not rely on client-supplied user IDs as proof of
    identity.
-   Use HTTPS in production and keep database credentials and token
    secrets private.

## Future improvements

-   Persist timer deadlines and restore active auctions after a server
    restart.
-   Add stronger Socket.IO authentication and authorization.
-   Add automated tests for bidding, timer transitions, and room
    permissions.
-   Add deployment configuration and production environment settings.
-   Improve auction history and participant experience.
-   Adding Node.js Cluster to AuctionGame would be a great next step, especially because it would help you understand how production Node.js applications handle multiple concurrent connections.
<img width="930" height="469" alt="image" src="https://github.com/user-attachments/assets/2026e6a4-0b4f-4a73-a4e5-2227cd72bb4f" />
