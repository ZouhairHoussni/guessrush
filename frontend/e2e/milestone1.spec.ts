import { test, expect } from "@playwright/test";

test.describe("Milestone 1 smoke", () => {
  test("host creates a room and a mobile player joins the live lobby", async ({ browser }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hostPage = await hostContext.newPage();
    await hostPage.goto("/");
    await expect(hostPage.getByText("GuessRush").first()).toBeVisible();
    await hostPage.getByRole("link", { name: /create a game/i }).click();
    await hostPage.getByRole("button", { name: /next/i }).click();
    await hostPage.getByRole("button", { name: /next/i }).click();
    await hostPage.getByRole("button", { name: /create room/i }).click();

    await expect(hostPage.getByText("Scan to join")).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /copy link/i })).toBeVisible();
    const url = hostPage.url();
    const code = url.match(/\/room\/([A-Z0-9]{6})\/host/)?.[1];
    expect(code).toBeTruthy();

    const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const playerPage = await playerContext.newPage();
    await playerPage.goto(`/join/${code}`);
    await expect(playerPage.getByRole("heading", { name: code! })).toBeVisible();
    await playerPage.getByLabel("Your name").fill("Alice");
    await playerPage.getByRole("button", { name: /join game/i }).click();

    await expect(playerPage.getByText("You joined")).toBeVisible();
    await expect(playerPage.getByRole("heading", { name: "Alice" })).toBeVisible();
    await expect(playerPage.getByText("Blue Comets").first()).toBeVisible();
    await expect(hostPage.getByTestId("team-member").filter({ hasText: "Alice" })).toBeVisible();

    await hostPage.screenshot({
      path: "../docs/screenshots/m1-host-desktop-1440x900.png",
      fullPage: false,
    });

    await playerPage.screenshot({
      path: "../docs/screenshots/m1-player-mobile-390x844.png",
      fullPage: false,
    });

    await hostContext.close();
    await playerContext.close();
  });
});

async function createRoom(
  page: import("@playwright/test").Page,
  personalCards = false,
  cardsPerPlayer = 3,
) {
  await page.goto("/");
  await page.getByRole("link", { name: /create a game/i }).click();
  if (personalCards) {
    await page.getByRole("button", { name: /personal cards/i }).click();
  }
  await page.getByRole("button", { name: /next/i }).click();
  if (personalCards && cardsPerPlayer !== 3) {
    await page
      .locator("fieldset")
      .filter({ hasText: "Cards per player" })
      .getByRole("button", { name: `${cardsPerPlayer}` })
      .click();
  }
  await page.getByRole("button", { name: /next/i }).click();
  await page.getByRole("button", { name: /create room/i }).click();
  await expect(page.getByText("Scan to join")).toBeVisible();
  const code = page.url().match(/\/room\/([A-Z0-9]{6})\/host/)?.[1];
  expect(code).toBeTruthy();
  return code!;
}

async function addCards(page: import("@playwright/test").Page, cards: string[]) {
  for (const card of cards) {
    await page.getByLabel("Card text").fill(card);
    await page.getByRole("button", { name: /add card/i }).click();
  }
}

async function scoreCards(page: import("@playwright/test").Page, count: number) {
  for (let index = 0; index < count; index += 1) {
    const scoreButton = page.getByRole("button", { name: /got it/i });
    await expect(scoreButton).toBeEnabled();
    const cardText =
      index < count - 1 ? await page.getByTestId("current-card-text").innerText() : null;
    await scoreButton.click();
    if (cardText) {
      await expect(page.getByTestId("current-card-text")).not.toHaveText(cardText);
    }
  }
  await expect(page.getByText(/turn complete/i)).toBeVisible();
}

test.describe("Milestone 2 ready flow", () => {
  test("personal cards stay secret and host can start only after submissions and ready", async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hostPage = await hostContext.newPage();
    const code = await createRoom(hostPage, true);

    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeDisabled();

    const aliceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alicePage = await aliceContext.newPage();
    await alicePage.goto(`/join/${code}`);
    await alicePage.getByLabel("Your name").fill("Alice");
    await alicePage.getByRole("button", { name: /join game/i }).click();
    await expect(alicePage.getByText("Secret cards")).toBeVisible();
    await addCards(alicePage, ["Moon Pancake", "Bubble Museum", "Neon Umbrella"]);
    await alicePage.screenshot({
      path: "../docs/screenshots/m2-card-mobile-390x844.png",
      fullPage: false,
    });
    await alicePage.getByRole("button", { name: /submit/i }).click();
    await alicePage.getByRole("button", { name: /i'm ready/i }).click();

    const bilalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bilalPage = await bilalContext.newPage();
    await bilalPage.goto(`/join/${code}`);
    await bilalPage.getByLabel("Your name").fill("Bilal");
    await bilalPage.getByRole("button", { name: /join game/i }).click();
    await addCards(bilalPage, ["Moon Pancake", "Kitchen Comet", "Solar Backpack"]);
    await bilalPage.getByRole("button", { name: /submit/i }).click();
    await expect(
      bilalPage.getByText('This card already exists: "Moon Pancake". Please choose a different one.'),
    ).toBeVisible();
    await bilalPage.getByRole("button", { name: "Remove Moon Pancake" }).click();
    await bilalPage.getByLabel("Card text").fill("Paper Castle");
    await bilalPage.getByRole("button", { name: /add card/i }).click();
    await bilalPage.getByRole("button", { name: /submit/i }).click();
    await bilalPage.getByRole("button", { name: /i'm ready/i }).click();

    await expect(hostPage.getByText("Moon Pancake")).toHaveCount(0);
    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeEnabled();
    await hostPage.getByText("Host tools").click();
    await hostPage.getByRole("button", { name: /shuffle teams/i }).click();
    await expect(hostPage.getByText(/^New teams:/)).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeEnabled();
    await hostPage.screenshot({
      path: "../docs/screenshots/m2-host-ready-desktop-1440x900.png",
      fullPage: false,
    });
    await hostPage.getByRole("button", { name: /start game/i }).click();
    await expect(hostPage.getByText("ROUND 1")).toBeVisible();
    await expect(alicePage).toHaveURL(new RegExp(`/room/${code}/play$`));
    await expect(bilalPage).toHaveURL(new RegExp(`/room/${code}/play$`));

    await hostContext.close();
    await aliceContext.close();
    await bilalContext.close();
  });
});

test.describe("Milestone 4 live gameplay flow", () => {
  test("active player can skip and score while spectators and display stay card-blind", async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hostPage = await hostContext.newPage();
    const code = await createRoom(hostPage);

    const playerData = [
      { name: "Alice", viewport: { width: 390, height: 844 } },
      { name: "Bilal", viewport: { width: 390, height: 844 } },
      { name: "Amine", viewport: { width: 390, height: 844 } },
      { name: "Badr", viewport: { width: 390, height: 844 } },
    ];
    const players = [];
    for (const data of playerData) {
      const context = await browser.newContext({ viewport: data.viewport });
      const page = await context.newPage();
      await page.goto(`/join/${code}`);
      await page.getByLabel("Your name").fill(data.name);
      await page.getByRole("button", { name: /join game/i }).click();
      await page.getByRole("button", { name: /i'm ready/i }).click();
      players.push({ ...data, context, page });
    }

    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeEnabled();
    await hostPage.getByRole("button", { name: /start game/i }).click();
    await expect(hostPage.getByText("ROUND 1")).toBeVisible();
    for (const player of players) {
      await expect(player.page).toHaveURL(new RegExp(`/room/${code}/play$`));
    }
    await hostPage.getByRole("button", { name: /begin round/i }).click();
    await expect(hostPage.getByText(/alice is clue-giver/i)).toBeVisible();
    await hostPage.screenshot({
      path: "../docs/screenshots/polish-turn-ready-desktop-1440x900.png",
      fullPage: false,
    });

    const alice = players[0].page;
    const bilal = players[1].page;
    await expect(alice.getByText(/your turn, alice/i)).toBeVisible();
    await alice.screenshot({
      path: "../docs/screenshots/polish-turn-ready-mobile-390x844.png",
      fullPage: false,
    });
    await alice.getByRole("button", { name: /start my turn/i }).click();
    await expect(alice.getByTestId("current-card-text")).not.toHaveText("Syncing...");
    await expect(alice.getByRole("button", { name: /got it/i })).toBeEnabled();
    await expect(alice.getByRole("button", { name: /skip/i })).toBeEnabled();
    const cardText = await alice.getByTestId("current-card-text").innerText();
    expect(cardText.length).toBeGreaterThan(1);

    const displayContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const displayPage = await displayContext.newPage();
    await displayPage.goto(`/room/${code}/display`);
    await expect(displayPage.getByText(/alice for blue comets/i)).toBeVisible();
    await expect(displayPage.getByText(/card stays private/i)).toBeVisible();

    await hostPage.screenshot({
      path: "../docs/screenshots/m4-host-live-desktop-1440x900.png",
      fullPage: false,
    });
    await alice.screenshot({
      path: "../docs/screenshots/m4-active-turn-mobile-390x844.png",
      fullPage: false,
    });
    await displayPage.screenshot({
      path: "../docs/screenshots/m4-shared-display-desktop-1440x900.png",
      fullPage: false,
    });

    await expect(hostPage.getByText(cardText, { exact: true })).toHaveCount(0);
    await expect(bilal.getByText(cardText, { exact: true })).toHaveCount(0);
    await expect(displayPage.getByText(cardText, { exact: true })).toHaveCount(0);
    await alice.getByRole("button", { name: /skip/i }).click();
    await expect(alice.getByTestId("current-card-text")).not.toHaveText(cardText);
    const cardAfterSkip = await alice.getByTestId("current-card-text").innerText();

    await alice.reload();
    await expect(alice.getByTestId("current-card-text")).toHaveText(cardAfterSkip);
    await expect(alice.getByRole("button", { name: /got it/i })).toBeEnabled();

    await alice.getByRole("button", { name: /got it/i }).click();
    await expect(alice.getByTestId("current-card-text")).not.toHaveText(cardAfterSkip);
    await expect(
      displayPage.getByTestId("team-score").filter({ hasText: "Blue Comets" }).getByText("1"),
    ).toBeVisible();

    await hostContext.close();
    await displayContext.close();
    for (const player of players) {
      await player.context.close();
    }
  });
});

test.describe("Milestone 5 recap results flow", () => {
  test("undo, round summaries, final results and rematch work across devices", async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hostPage = await hostContext.newPage();
    const code = await createRoom(hostPage, true, 2);

    const aliceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const alicePage = await aliceContext.newPage();
    await alicePage.goto(`/join/${code}`);
    await alicePage.getByLabel("Your name").fill("Alice");
    await alicePage.getByRole("button", { name: /join game/i }).click();
    await addCards(alicePage, ["Orbit Spoon", "Signal Hat"]);
    await alicePage.getByRole("button", { name: /submit/i }).click();
    await alicePage.getByRole("button", { name: /i'm ready/i }).click();

    const bilalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const bilalPage = await bilalContext.newPage();
    await bilalPage.goto(`/join/${code}`);
    await bilalPage.getByLabel("Your name").fill("Bilal");
    await bilalPage.getByRole("button", { name: /join game/i }).click();
    await addCards(bilalPage, ["Puzzle Kite", "Velvet Rocket"]);
    await bilalPage.getByRole("button", { name: /submit/i }).click();
    await bilalPage.getByRole("button", { name: /i'm ready/i }).click();

    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeEnabled();
    await hostPage.getByRole("button", { name: /start game/i }).click();
    await hostPage.getByRole("button", { name: /begin round/i }).click();

    await alicePage.goto(`/room/${code}/play`);
    await bilalPage.goto(`/room/${code}/play`);
    await expect(alicePage.getByText(/your turn, alice/i)).toBeVisible();
    await alicePage.getByRole("button", { name: /start my turn/i }).click();
    await scoreCards(alicePage, 4);
    await expect(alicePage.getByText("4 guessed")).toBeVisible();
    await alicePage.screenshot({
      path: "../docs/screenshots/m5-turn-recap-mobile-390x844.png",
      fullPage: false,
    });
    await alicePage.getByRole("button", { name: /undo last/i }).click();
    await expect(alicePage.getByText(/scored 3 this turn/i)).toBeVisible();
    await alicePage.getByRole("button", { name: /confirm/i }).click();

    await expect(bilalPage.getByText(/your turn, bilal/i)).toBeVisible();
    await bilalPage.getByRole("button", { name: /start my turn/i }).click();
    await scoreCards(bilalPage, 1);
    await bilalPage.getByRole("button", { name: /confirm/i }).click();

    await expect(hostPage.getByText(/round 1 complete/i)).toBeVisible();
    await hostPage.screenshot({
      path: "../docs/screenshots/m5-round-summary-desktop-1440x900.png",
      fullPage: false,
    });

    await hostPage.getByRole("button", { name: /start next round/i }).click();
    await hostPage.getByRole("button", { name: /begin round/i }).click();
    await expect(alicePage.getByText(/your turn, alice/i)).toBeVisible();
    await alicePage.getByRole("button", { name: /start my turn/i }).click();
    await scoreCards(alicePage, 4);
    await alicePage.getByRole("button", { name: /confirm/i }).click();

    await expect(hostPage.getByText(/round 2 complete/i)).toBeVisible();
    await hostPage.getByRole("button", { name: /start next round/i }).click();
    await hostPage.getByRole("button", { name: /begin round/i }).click();
    await expect(bilalPage.getByText(/your turn, bilal/i)).toBeVisible();
    await bilalPage.getByRole("button", { name: /start my turn/i }).click();
    await scoreCards(bilalPage, 4);
    await bilalPage.getByRole("button", { name: /confirm/i }).click();

    await expect(hostPage.getByText(/round 3 complete/i)).toBeVisible();
    await hostPage.getByRole("button", { name: /show final results/i }).click();
    await expect(hostPage.getByText(/final results/i)).toBeVisible();
    await expect(hostPage.getByRole("button", { name: "Rematch", exact: true })).toBeVisible();
    await hostPage.screenshot({
      path: "../docs/screenshots/m5-results-desktop-1440x900.png",
      fullPage: false,
    });
    await bilalPage.screenshot({
      path: "../docs/screenshots/m5-results-mobile-390x844.png",
      fullPage: false,
    });

    await hostPage.getByRole("button", { name: /^rematch$/i }).click();
    await expect(hostPage.getByText("ROUND 1")).toBeVisible();
    await expect(hostPage.getByRole("button", { name: /begin round/i })).toBeVisible();

    await hostContext.close();
    await aliceContext.close();
    await bilalContext.close();
  });
});

test.describe("Milestone 6 recovery and permissions", () => {
  test("rejects unauthorized commands and recovers spectator score snapshots without card leaks", async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const hostPage = await hostContext.newPage();
    const code = await createRoom(hostPage);

    await hostPage.screenshot({
      path: "../docs/screenshots/m6-host-invite-desktop-1440x900.png",
      fullPage: false,
    });

    const playerData = [
      { name: "Alice", viewport: { width: 390, height: 844 } },
      { name: "Bilal", viewport: { width: 390, height: 844 } },
      { name: "Amine", viewport: { width: 390, height: 844 } },
      { name: "Badr", viewport: { width: 390, height: 844 } },
    ];
    const players = [];
    for (const data of playerData) {
      const context = await browser.newContext({ viewport: data.viewport });
      const page = await context.newPage();
      await page.goto(`/join/${code}`);
      await page.getByLabel("Your name").fill(data.name);
      await page.getByRole("button", { name: /join game/i }).click();
      await page.getByRole("button", { name: /i'm ready/i }).click();
      players.push({ ...data, context, page });
    }

    await expect(hostPage.getByRole("button", { name: /start game/i })).toBeEnabled();
    await hostPage.getByRole("button", { name: /start game/i }).click();
    await expect(hostPage.getByText("ROUND 1")).toBeVisible();
    await hostPage.getByRole("button", { name: /begin round/i }).click();
    await expect(hostPage.getByText(/alice is clue-giver/i)).toBeVisible();

    const missingHostToken = await hostPage.request.post(
      `http://127.0.0.1:8011/api/v1/rooms/${code}/host/start-round`,
    );
    expect(missingHostToken.status()).toBe(403);
    expect((await missingHostToken.json()).error.code).toBe("HOST_TOKEN_REQUIRED");

    for (const player of players) {
      await player.page.goto(`/room/${code}/play`);
    }

    const alice = players[0].page;
    const bilal = players[1].page;
    await expect(alice.getByText(/your turn, alice/i)).toBeVisible();
    await alice.getByRole("button", { name: /start my turn/i }).click();
    await expect(alice.getByTestId("current-card-text")).not.toHaveText("Syncing...");
    const liveCard = await alice.getByTestId("current-card-text").innerText();
    expect(liveCard.length).toBeGreaterThan(1);

    const bilalToken = await bilal.evaluate((roomCode) => {
      return window.localStorage.getItem(`guessrush:player:${roomCode}`);
    }, code);
    expect(bilalToken).toBeTruthy();
    const deniedScore = await bilal.request.post(
      `http://127.0.0.1:8011/api/v1/rooms/${code}/turns/current/correct`,
      {
        headers: {
          "X-Player-Token": bilalToken!,
          "Idempotency-Key": "m6-non-active-score",
        },
      },
    );
    expect(deniedScore.status()).toBe(403);
    expect((await deniedScore.json()).error.code).toBe("ACTIVE_PLAYER_REQUIRED");
    await expect(bilal.getByText(liveCard, { exact: true })).toHaveCount(0);

    await alice.getByRole("button", { name: /got it/i }).click();
    await expect(
      bilal.getByTestId("team-score").filter({ hasText: "Blue Comets" }).getByText("1"),
    ).toBeVisible();

    await bilal.reload();
    await expect(
      bilal.getByTestId("team-score").filter({ hasText: "Blue Comets" }).getByText("1"),
    ).toBeVisible();
    await expect(bilal.getByText(liveCard, { exact: true })).toHaveCount(0);

    await bilal.screenshot({
      path: "../docs/screenshots/m6-spectator-recovery-mobile-390x844.png",
      fullPage: false,
    });

    await hostContext.close();
    for (const player of players) {
      await player.context.close();
    }
  });
});
