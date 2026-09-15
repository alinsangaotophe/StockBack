import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import bs58 from "bs58";
import {
  WalletController,
  publicAddress,
  type SolanaProvider,
} from "../../lib/wallet/controller";
const a = bs58.encode(new Uint8Array(32).fill(1)),
  b = bs58.encode(new Uint8Array(32).fill(2));
class Provider extends EventEmitter implements SolanaProvider {
  publicKey: unknown = null;
  isConnected = false;
  calls = 0;
  action: () => Promise<{ publicKey: unknown }> = async () => {
    this.publicKey = a;
    this.isConnected = true;
    return { publicKey: a };
  };
  connect() {
    this.calls++;
    return this.action();
  }
  async disconnect() {
    this.isConnected = false;
    this.publicKey = null;
    this.emit("disconnect");
  }
}
test("missing provider never becomes connected", async () => {
  const c = new WalletController(() => undefined);
  assert.equal(await c.connect("phantom"), false);
  assert.equal(c.getSnapshot().address, null);
  assert.match(c.getSnapshot().error!, /not detected/);
});
test("provider selection, account changes, null account and listener cleanup", async () => {
  const phantom = new Provider(),
    okx = new Provider();
  const c = new WalletController((id) => (id === "phantom" ? phantom : okx));
  await c.connect("okx");
  assert.equal(phantom.calls, 0);
  assert.equal(c.getSnapshot().id, "okx");
  assert.equal(c.getSnapshot().address, a);
  okx.emit("accountChanged", b);
  assert.equal(c.getSnapshot().address, b);
  okx.emit("accountChanged", null);
  assert.equal(c.getSnapshot().address, null);
  assert.equal(okx.listenerCount("accountChanged"), 0);
});
test("reject, retry, disconnect", async () => {
  const p = new Provider(),
    c = new WalletController(() => p);
  const success = p.action;
  p.action = async () => {
    throw { code: 4001 };
  };
  assert.equal(await c.connect("phantom"), false);
  assert.match(c.getSnapshot().error!, /declined/);
  p.action = success;
  await c.connect("phantom");
  await c.disconnect();
  assert.equal(c.getSnapshot().address, null);
  assert.equal(p.listenerCount("disconnect"), 0);
});
test("cancelled promise cannot overwrite a later connection", async () => {
  const p = new Provider(),
    o = new Provider();
  let resolve!: (result: { publicKey: string }) => void;
  p.action = () =>
    new Promise((r) => {
      resolve = r;
    });
  const c = new WalletController((id) => (id === "phantom" ? p : o));
  const first = c.connect("phantom");
  assert.equal(await c.connect("okx"), false);
  c.cancel();
  await c.connect("okx");
  p.isConnected = true;
  p.publicKey = b;
  resolve({ publicKey: b });
  assert.equal(await first, false);
  assert.equal(c.getSnapshot().id, "okx");
  assert.equal(c.getSnapshot().address, a);
});
test("switching detaches old provider and external disconnect clears selection", async () => {
  const p = new Provider(),
    o = new Provider(),
    c = new WalletController((id) => (id === "phantom" ? p : o));
  await c.connect("phantom");
  await c.connect("okx");
  assert.equal(p.listenerCount("accountChanged"), 0);
  p.emit("accountChanged", b);
  assert.equal(c.getSnapshot().address, a);
  o.emit("disconnect");
  assert.equal(c.getSnapshot().address, null);
});
test("invalid and disconnected account responses fail closed", async () => {
  assert.equal(publicAddress("not-a-key"), null);
  const p = new Provider(),
    c = new WalletController(() => p);
  p.action = async () => ({ publicKey: a });
  assert.equal(await c.connect("phantom"), false);
  p.isConnected = true;
  p.action = async () => ({ publicKey: "bad" });
  assert.equal(await c.connect("phantom"), false);
  assert.equal(c.getSnapshot().address, null);
});
test("unmount invalidates an in-flight response", async () => {
  const p = new Provider();
  let resolve!: (result: { publicKey: string }) => void;
  p.action = () =>
    new Promise((r) => {
      resolve = r;
    });
  const c = new WalletController(() => p),
    attempt = c.connect("phantom");
  c.dispose();
  p.isConnected = true;
  resolve({ publicKey: a });
  assert.equal(await attempt, false);
  assert.equal(p.listenerCount("accountChanged"), 0);
});
test("signing requires capabilities and rejects an account change during approval", async () => {
  const p = new Provider() as Provider & {
    signMessage?: SolanaProvider["signMessage"];
  };
  const c = new WalletController(() => p);
  await c.connect("phantom");
  await assert.rejects(
    c.signMessage(new Uint8Array([1])),
    /supports message signing/,
  );
  let finish!: (value: { signature: Uint8Array }) => void;
  p.signMessage = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = c.signMessage(new Uint8Array([1]));
  p.publicKey = b;
  p.emit("accountChanged", b);
  finish({ signature: new Uint8Array(64) });
  await assert.rejects(pending, /Wallet changed/);
});
