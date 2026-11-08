# AuctionGame

A real-time, room-based auction application built with **Node.js,
Express, MongoDB, Socket.IO, Javascript and Typescript **.

AuctionGame allows a host to create an auction room, add items to an
auction queue, and manage live bidding. Participants join the room,
place bids on the active item, and see bid and auction updates in real
time.

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

## License

Add a license here if you intend to distribute or open-source this
project. Until a license is added, all rights remain with the copyright
holder.
