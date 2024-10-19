import { alphabet, generateRandomString } from "oslo/crypto";

const randomString = generateRandomString(100, alphabet("a-z", "A-Z", "0-9", "-", "_"));

console.log(randomString);
