
# BoardgameGeek Recommender Script

A small userscript that injects game recommendations into BoardGameGeek game pages by querying a configurable recommender API.

## Features

- Injects a "Similar Games (Custom API)" panel on BGG game pages
- Displays thumbnails, ratings, playtime/players, and similarity score
- Easy to point at your own recommender instance via a single constant

## Installation

1. Install Violentmonkey (or another userscript manager): https://violentmonkey.github.io/get-it/
2. Install the userscript by visiting the [raw script URL](https://github.com/FrederikBertelsen/bgg-recommender-script/raw/refs/heads/main/bgg_recommender.user.js) or importing the file into your userscript manager.
3. Open the userscript in your editor and set the API endpoint at the top of the file (see **Configuration**).

## Configuration

Edit the `API_BASE_URL` constant at the top of the script and set it to your recommender API, for example:

```
const API_BASE_URL = 'https://your-recommender.example.com';
```

If `API_BASE_URL` is empty or unset the script will show a popup alert and will not attempt to call the API.

## Usage

- Visit any BoardGameGeek game page (URLs like `https://boardgamegeek.com/boardgame/<id>`).
- The script will add a "Similar Games (Custom API)" section inside the game description area.
- Click any recommendation to open its BGG page in a new tab.

## Troubleshooting

- If you see the popup "Please set API_BASE_URL...", open the userscript and set `API_BASE_URL`.
- If recommendations don't appear but `API_BASE_URL` is set, check the browser console for network or parse errors.

