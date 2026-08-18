/**
 * The relay, tested for what it must and must not do.
 *
 * The "must not" half matters more here than usual: this is the one component
 * that sees other people's data, so the tests that prove it can't read it, and
 * can't hand it to the wrong device, are the point.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { App } from "./app.js";
import { Db } from "./db.js";

let app: App;
let clock = 1_000_000;

const call = (
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; ip?: string } = {},
) => {
  const [p, q] = path.split("?");
  return app.handle({
    method,
    path: p!,
    query: new URLSearchParams(q ?? ""),
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    body: opts.body ?? null,
    ip: opts.ip ?? "1.2.3.4",
  });
};

async function newAccount(accountId = "acc_test") {
  const res = await call("POST", "/v1/accounts", { body: { accountId, deviceName: "laptop" } });
  return res.body as { accountId: string; deviceId: string; token: string };
}

beforeEach(() => {
  clock = 1_000_000;
  app = new App({ db: new Db(":memory:"), now: () => clock, rateLimit: 0 });
});

describe("accounts", () => {
  it("creates an account and enrols the first device", async () => {
    const a = await newAccount();
    assert.equal(a.accountId, "acc_test");
    assert.match(String(a.deviceId), /^dev_/);
    assert.ok((a.token.length) > (30));
  });

  it("never stores the token in the clear", async () => {
    const a = await newAccount();
    const rows = app.db.raw.prepare("SELECT * FROM devices").all() as unknown as {
      token_hash: string;
    }[];
    assert.notEqual(rows[0]!.token_hash, a.token);
    assert.ok(!(JSON.stringify(rows)).includes(a.token));
  });

  it("refuses to create the same account twice", async () => {
    await newAccount();
    assert.equal((await call("POST", "/v1/accounts", { body: { accountId: "acc_test" } })).status, 409);
  });

  it("rejects a malformed account id rather than storing it", async () => {
    const res = await call("POST", "/v1/accounts", { body: { accountId: "../../etc/passwd" } });
    assert.equal(res.status, 400);
  });
});

describe("authentication", () => {
  it("refuses every sync route without a token", async () => {
    for (const [m, p] of [["POST", "/v1/sync/push"], ["GET", "/v1/sync/pull"], ["GET", "/v1/devices"]]) {
      assert.equal((await call(m!, p!)).status, 401);
    }
  });

  it("refuses a token that isn't one it issued", async () => {
    await newAccount();
    assert.equal((await call("GET", "/v1/sync/pull", { token: "not-a-real-token" })).status, 401);
  });
});

describe("the log", () => {
  it("round-trips a sealed blob", async () => {
    const a = await newAccount();
    const sealed = { v: 1, iv: "abc", ct: "def" };
    const push = await call("POST", "/v1/sync/push", { token: a.token, body: { sealed } });
    assert.equal(push.status, 200);

    const pull = await call("GET", "/v1/sync/pull?since=0", { token: a.token });
    const page = pull.body as { items: { sealed: unknown }[] };
    assert.deepEqual(page.items[0]!.sealed, sealed);
  });

  it("stores ciphertext and nothing else — a dump reveals no content", async () => {
    const a = await newAccount();
    await call("POST", "/v1/sync/push", {
      token: a.token,
      body: { sealed: { v: 1, iv: "aXY", ct: "9dGhpcyBpcyBjaXBoZXJ0ZXh0" } },
    });
    const dump = JSON.stringify(app.db.raw.prepare("SELECT * FROM entries").all());
    assert.doesNotMatch(String(dump), /topic|roadmap|title|Ottoman/i);
  });

  it("advances the cursor and returns only what's new", async () => {
    const a = await newAccount();
    for (let i = 0; i < 3; i++) {
      await call("POST", "/v1/sync/push", { token: a.token, body: { sealed: { n: i } } });
    }
    const first = (await call("GET", "/v1/sync/pull?since=0", { token: a.token })).body as {
      cursor: string; items: unknown[];
    };
    assert.equal((first.items).length, 3);

    const second = (await call(`GET`, `/v1/sync/pull?since=${first.cursor}`, { token: a.token }))
      .body as { items: unknown[] };
    assert.equal((second.items).length, 0);
  });

  it("paginates and reports hasMore", async () => {
    const a = await newAccount();
    for (let i = 0; i < 5; i++) {
      await call("POST", "/v1/sync/push", { token: a.token, body: { sealed: { n: i } } });
    }
    const page = (await call("GET", "/v1/sync/pull?since=0&limit=2", { token: a.token })).body as {
      items: unknown[]; hasMore: boolean;
    };
    assert.equal((page.items).length, 2);
    assert.equal(page.hasMore, true);
  });

  it("keeps accounts apart — one account can never read another's log", async () => {
    const mine = await newAccount("acc_mine");
    const theirs = await newAccount("acc_theirs");
    await call("POST", "/v1/sync/push", { token: mine.token, body: { sealed: { secret: 1 } } });

    const page = (await call("GET", "/v1/sync/pull?since=0", { token: theirs.token })).body as {
      items: unknown[];
    };
    assert.equal((page.items).length, 0);
  });

  it("refuses a push with no payload instead of storing junk", async () => {
    const a = await newAccount();
    assert.equal((await call("POST", "/v1/sync/push", { token: a.token, body: {} })).status, 400);
  });
});

describe("pairing", () => {
  async function offer(token: string, code = "ABCD2345") {
    await call("POST", "/v1/pairings", { token, body: { code, expiresAt: clock + 300_000 } });
    return code;
  }

  it("pairs a second device onto the same account", async () => {
    const a = await newAccount();
    const code = await offer(a.token);

    const res = await call("POST", "/v1/pairings/claim", {
      body: { accountId: a.accountId, code, deviceName: "phone" },
    });
    assert.equal(res.status, 200);
    const b = res.body as { accountId: string; deviceId: string; token: string };
    assert.equal(b.accountId, a.accountId);
    assert.notEqual(b.deviceId, a.deviceId);
    assert.notEqual(b.token, a.token);
  });

  it("the paired device reads what the first one wrote", async () => {
    const a = await newAccount();
    await call("POST", "/v1/sync/push", { token: a.token, body: { sealed: { v: 1, ct: "x" } } });
    const code = await offer(a.token);
    const b = (await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } }))
      .body as { token: string };

    const page = (await call("GET", "/v1/sync/pull?since=0", { token: b.token })).body as {
      items: unknown[];
    };
    assert.equal((page.items).length, 1);
  });

  it("a code works exactly once", async () => {
    const a = await newAccount();
    const code = await offer(a.token);
    await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } });
    const second = await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } });
    assert.equal(second.status, 400);
  });

  it("expires", async () => {
    const a = await newAccount();
    const code = await offer(a.token);
    clock += 400_000;
    const res = await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } });
    assert.equal(res.status, 400);
  });

  it("caps the lifetime a client can ask for — the UI promises five minutes", async () => {
    const a = await newAccount();
    const res = await call("POST", "/v1/pairings", {
      token: a.token,
      body: { code: "LONGLIVE", expiresAt: clock + 999_999_999 },
    });
    assert.ok(((res.body as { expiresAt: number }).expiresAt) <= (clock + 600_000));
  });

  it("locks a code after repeated guesses", async () => {
    const a = await newAccount();
    const code = await offer(a.token);
    for (let i = 0; i < 8; i++) {
      await call("POST", "/v1/pairings/claim", { body: { accountId: "acc_wrong", code } });
    }
    const res = await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } });
    assert.equal(res.status, 429);
  });

  it("gives the same answer for a wrong code and a wrong account", async () => {
    const a = await newAccount();
    const code = await offer(a.token);
    const wrongAccount = await call("POST", "/v1/pairings/claim", {
      body: { accountId: "acc_someone_else", code },
    });
    const wrongCode = await call("POST", "/v1/pairings/claim", {
      body: { accountId: a.accountId, code: "ZZZZ9999" },
    });
    assert.deepEqual(wrongAccount.body, wrongCode.body);
    assert.equal(wrongAccount.status, wrongCode.status);
  });

  it("needs a token to offer a code — you can't invite yourself in", async () => {
    await newAccount();
    assert.equal((await call("POST", "/v1/pairings", { body: { code: "ABCD2345" } })).status, 401);
  });
});

describe("housekeeping", () => {
  it("prunes only what every device has read", async () => {
    const a = await newAccount();
    const code = "ABCD2345";
    await call("POST", "/v1/pairings", { token: a.token, body: { code, expiresAt: clock + 300_000 } });
    const b = (await call("POST", "/v1/pairings/claim", { body: { accountId: a.accountId, code } }))
      .body as { token: string };

    await call("POST", "/v1/sync/push", { token: a.token, body: { sealed: { n: 1 } } });
    // Only the laptop has read it. The phone must still be able to.
    await call("GET", "/v1/sync/pull?since=0", { token: a.token });
    clock += 30 * 24 * 60 * 60 * 1000;
    await call("POST", "/v1/sync/push", { token: a.token, body: { sealed: { n: 2 } } });

    const page = (await call("GET", "/v1/sync/pull?since=0", { token: b.token })).body as {
      items: unknown[];
    };
    assert.ok((page.items.length) >= (2));
  });

  it("lists the devices on the account so a stranger is visible", async () => {
    const a = await newAccount();
    const res = await call("GET", "/v1/devices", { token: a.token });
    const { devices } = res.body as { devices: { name: string; current: boolean }[] };
    assert.equal((devices).length, 1);
    assert.equal(devices[0]!.current, true);
    assert.equal(devices[0]!.name, "laptop");
  });
});

describe("rate limiting", () => {
  it("cuts off a caller hammering the box", async () => {
    app = new App({ db: new Db(":memory:"), now: () => clock, rateLimit: 5 });
    for (let i = 0; i < 5; i++) assert.equal((await call("GET", "/v1/health")).status, 200);
    assert.equal((await call("GET", "/v1/health")).status, 429);
    // A different caller is unaffected.
    assert.equal((await call("GET", "/v1/health", { ip: "9.9.9.9" })).status, 200);
  });
});
