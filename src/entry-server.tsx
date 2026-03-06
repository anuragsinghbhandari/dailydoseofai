import * as React from "react";
import { StartServer } from "@tanstack/react-start/server";
import { getRouter } from "./router";

export default function EntryServer() {
  const router = getRouter();
  return <StartServer router={router} />;
}



