import { test } from "node:test";
import assert from "node:assert/strict";
import { genreFor } from "./genres";

test("genre: hymn number, then iTunes, then artist, else pop", () => {
  assert.equal(genreFor({ title: "Mari Bersukacita (KJ 200)", artist: "Hillsong Worship" }), "hymne");
  assert.equal(genreFor({ title: "X", artist: "Hillsong Worship", itunesGenre: "Christian" }), "pop");
  assert.equal(genreFor({ title: "X", artist: "Hillsong Worship", itunesGenre: "Alternative" }), "rock-alternatif");
  assert.equal(genreFor({ title: "X", artist: "Hillsong UNITED" }), "rock-alternatif");
  assert.equal(genreFor({ title: "X", artist: "Michael Bublé", itunesGenre: "Holiday" }), "pop-jazz");
  assert.equal(genreFor({ title: "X", artist: null }), null);
});
