"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { WalletController, emptyWallet, type WalletId } from "./controller";
export function useWallet() {
  const [controller] = useState(() => new WalletController());
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    () => emptyWallet,
  );
  useEffect(() => {
    controller.refresh();
    const timers = [300, 1000, 2500].map((ms) =>
      setTimeout(controller.refresh, ms),
    );
    window.addEventListener("focus", controller.refresh);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("focus", controller.refresh);
      controller.dispose();
    };
  }, [controller]);
  const cancel = () => {
    controller.cancel();
  };
  return {
    ...state,
    signMessage: controller.signMessage,
    signTransaction: controller.signTransaction,
    connect: async (id: WalletId) => {
      if (controller.getSnapshot().pending) return false;
      if (!(await controller.connect(id))) return false;
      return true;
    },
    disconnect: async () => {
      await controller.disconnect();
    },
    cancel,
    refresh: controller.refresh,
  };
}
