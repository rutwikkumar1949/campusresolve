const assert = require("node:assert/strict");
const { classify } = require("../classifier.js");

const cases = [
  ["Bhai 4th floor ka washroom ka tap 3 din se leak kar rha h", "Plumbing", "Medium", "Not specified"],
  ["Block B room 204 mein fan kaam nahi kar raha aur sparks aa rahe hain", "Electrical", "High", "Block B"],
  ["Hostel wifi down hai kal se internet nahi chal raha", "Wi-Fi", "Medium", "Not specified"],
  ["Mess mein khana thanda mil raha hai aur quality bahut kharab hai", "Mess", "Medium", "Not specified"],
  ["Attendance galat mark hui hai please check", "Academic", "Low", "Not specified"],
  ["The bathroom pipe is leaking in room 12", "Plumbing", "Medium", "Not specified"],
  ["There are sparks coming from the electrical socket urgently", "Electrical", "High", "Not specified"],
  ["Internet connection keeps disconnecting in hostel", "Wi-Fi", "Medium", "Not specified"],
  ["The mess served stale food at dinner", "Mess", "Low", "Not specified"],
  ["My semester result is missing from the student portal", "Academic", "Medium", "Not specified"],
  ["Block C, 2nd floor, Room 221: flush is broken", "Plumbing", "Medium", "Block C"],
  ["B block 3rd floor fan is not working", "Electrical", "Medium", "Block B"],
  ["Wifi password is not working", "Wi-Fi", "Medium", "Not specified"],
  ["Please improve the library seating arrangement", "Other", "Low", "Not specified"],
  ["Need information about campus bus timings", "Other", "Low", "Not specified"]
];

let passed = 0;
for (const [input, expectedDept, expectedUrgency, expectedBlock] of cases) {
  const result = classify(input);
  assert.equal(result.department, expectedDept, `Department mismatch for: ${input}`);
  assert.equal(result.urgency, expectedUrgency, `Urgency mismatch for: ${input}`);
  if (expectedBlock !== "Not specified") assert.equal(result.location.block, expectedBlock, `Block mismatch for: ${input}`);
  passed++;
}
const loc = classify("Please check Block D, 4th floor, Room 401 water tap leakage");
assert.equal(loc.location.block, "Block D");
assert.equal(loc.location.floor, "Floor 4");
assert.equal(loc.location.room, "Room 401");
console.log(`PASS: ${passed + 1}/${passed + 1} regression checks`);
