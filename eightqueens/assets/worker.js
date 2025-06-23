// Module initialization - start

const urlParams = new URLSearchParams(location.search);
const isProver = urlParams.get("role") == "prover" ? true : false;
const ligetronVer = urlParams.get("version");

var Module = {
  setStatus: function (x) {
    postMessage({ target: "status", value: x });
  },
};

let module_handler = isProver ? `${ligetronVer}_prover.js` : `${ligetronVer}_verifier.js`

importScripts(module_handler);

Module["FS"].createPath("/", "modules", true, true);

// Module initialization - end

var wssServerUrl = "wss://localhost:10444";
let packingSize = 8192;
if (ligetronVer == "webgpu") packingSize = 32768;

var inputData;

var UTF8Encoder =
  typeof TextEncoder != "undefined" ? new TextEncoder("utf8") : undefined;
var UTF8Decoder =
  typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined;
const delimiter = UTF8Encoder.encode("\r\n\r\n");

function checkForFinalOutput(outLine) {
  if (isProver && outLine.startsWith("stage3:")) {
  //  let proofData = Module["FS"].readFile("proof.data");
  //  Module["FS"].unlink("proof.data");
    self.postMessage({
      target: "showResult",
    //  proofData: proofData,
    //  inputData: inputData,
    });
  }
  if (!isProver && outLine.startsWith("Verify time:"))
    self.postMessage({ target: "enableAll" });
}

out = function (x) {
  //dump('OUT: ' + x + '\n');
  postMessage({ target: "stdout", content: x });
  checkForFinalOutput(x);
};

err = function (x) {
  //dump('ERR: ' + x + '\n');
  postMessage({ target: "stderr", content: x });
};

function UTF8Length(u) {
  // u - UTF-16 encoded Unicode point
  if (u >= 0xd800 && u <= 0xdfff) {
    var u1 = str.charCodeAt(++i);
    u = (0x10000 + ((u & 0x3ff) << 10)) | (u1 & 0x3ff);
  }
  if (u <= 0x7f) {
    return 1;
  } else if (u <= 0x7ff) {
    return 2;
  } else if (u <= 0xffff) {
    return 3;
  } else return 4;
}

function isWordChar(c) {
  return (
    (c >= "0" && c <= "9") ||
    (c >= "A" && c <= "Z") ||
    (c >= "a" && c <= "z") ||
    c == "_"
  );
}

function isJSON(text) {
  if (typeof text !== "string") {
    return false;
  }
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
}

function maskString(str, maskChar, keepType, keepArray) {
  var res = "";
  var i = 0;
  var maskNumber = 0;

  while (i < str.length) {
    var masked = true;
    var sectionEnd = 0;

    if (keepType == "non-word") {
      if (!isWordChar(str[i])) {
        masked = false;
        sectionEnd = i + 1;
      }
    } else if (keepType == "non-word without space") {
      if (!(isWordChar(str[i]) || str[i] == " ")) {
        masked = false;
        sectionEnd = i + 1;
      }
    } else if (keepType == "selected") {
      if (keepArray.includes(str[i])) {
        masked = false;
        sectionEnd = i + 1;
      }
    } else {
      for (const sel of keepArray) {
        if (i >= sel[0] && i < sel[1]) {
          masked = false;
          sectionEnd = sel[1];
          break;
        }
      }
    }

    if (masked) {
      // add as much of the mask character (#) as it is the length of this character when it is UTF-8 encoded
      maskNumber += UTF8Length(str.charCodeAt(i));
      i++;
    } else {
      res += maskChar.repeat(maskNumber);
      res += str.substring(i, sectionEnd);
      maskNumber = 0;
      i = sectionEnd;
    }
  }

  if (maskNumber) res += maskChar.repeat(maskNumber);
  return res;
}

function isHexadecimal(str) {
  // Regular expression to match a hexadecimal number, with or without the "0x" prefix
  const hexPattern = /^(0x)?[0-9a-fA-F]+$/;
  return hexPattern.test(str);
}

function createProof(argData, application, executeOnServer = false) {
  let mainArgs = [];
  let publicInputs = [];
  let privateIndices = [];
  let indicesInt64 = [];
  let indicesHex = [];
  let maskedLengths = new Map();
  let misc;

  for (let i = 0; i < argData.argList.length; i++) {
    let input = argData.argList[i];

    if (argData.privateIndexList.includes(i)) {
      maskedLengths.set(i, UTF8Encoder.encode(input).length);
      privateIndices.push(i + 1);
    } else {
      publicInputs.push(input);
    }

    if (argData.indicesHex.includes(i)) {
      if (isHexadecimal(input)) {
        indicesHex.push(i);
        mainArgs.push({ hex: input });
      } else {
        self.postMessage({
          target: "stderr",
          content: `${input} is not a hexadecimal value!`,
        });
        return;
      }
    } else if (argData.indicesInt64.includes(i)) {
      let intRes = parseInt(input);
      if (intRes || intRes === 0) {
        mainArgs.push({ i64: intRes });
        indicesInt64.push(i);
      } else {
        self.postMessage({
          target: "stderr",
          content: `${input} is not an integer value!`,
        });
        return;
      }
    } else mainArgs.push({ str: input });
  }

  misc = argData.misc;

  inputData = {
    packingSize: packingSize,
    publicInputs: publicInputs,
    indicesInt64: indicesInt64,
    indicesHex: indicesHex,
    maskedLengths: JSON.stringify([...maskedLengths]),
    hashedInput: "",
    application: application,
    misc: misc,
    onServer: executeOnServer,
  };

  let wasmPath = `modules/${application}.wasm`;

  let argJson = {
    "program": wasmPath,
    "shader-path": "shader",
    "packing": packingSize,
    "private-indices": privateIndices,
    "args": mainArgs,
  };

  if (!executeOnServer)
    callMain([JSON.stringify(argJson)]);
}

async function verifyLocalProof(argData, application, executeOnServer = false) {
  let mainArgs = [];
  let privateIndices = [];

  for (let i = 0; i < argData.argList.length; i++) {
    let input = argData.argList[i];
    if (argData.privateIndexList.includes(i)) {
      if (argData.indicesHex.includes(i)) {
        if (isHexadecimal(input)) {
          mainArgs.push({ hex: "f".repeat(UTF8Encoder.encode(input).length) });
        } else {
          self.postMessage({
            target: "stderr",
            content: `${input} is not a hexadecimal value!`,
          });
          return;
        }
      } else if (argData.indicesInt64.includes(i)) {
        let intRes = parseInt(input);
        if (intRes) {
          // Convert the integer to an integer with the same number the digits
          // to conceal it's value before the verification
          const onesStr = "1".repeat(number.toString().length);
          mainArgs.push({ i64: parseInt(onesStr, 10) });
        } else {
          self.postMessage({
            target: "stderr",
            content: `${input} is not an integer value!`,
          });
          return;
        }
      } else
        mainArgs.push({ str: "#".repeat(UTF8Encoder.encode(input).length) });
      privateIndices.push(i + 1);
    } else {
      if (argData.indicesHex.includes(i)) {
        if (isHexadecimal(input)) {
          mainArgs.push({ hex: input });
        } else {
          self.postMessage({
            target: "stderr",
            content: `${input} is not a hexadecimal value!`,
          });
          return;
        }
      } else if (argData.indicesInt64.includes(i)) {
        let intRes = parseInt(input);
        if (intRes) {
          mainArgs.push({ i64: intRes });
        } else {
          self.postMessage({
            target: "stderr",
            content: `${input} is not an integer value!`,
          });
          return;
        }
      } else mainArgs.push({ str: input });
    }
  }

  let wasmPath = `modules/${application}.wasm`;

  let argJson = {
    "program": wasmPath,
    "shader-path": "shader",
    "packing": packingSize,
    "private-indices": privateIndices,
    "args": mainArgs,
  };

  while (!Module["FS"].analyzePath("proof.data").exists) {
    await new Promise((r) => setTimeout(r, 100));
  }

  if (executeOnServer) {
    let encodedArgs = UTF8Encoder.encode(JSON.stringify(inputData));
    sendData(encodedArgs, "verifier_data");
  } else callMain([JSON.stringify(argJson)]);
}

async function verifyRecievedProof(application) {
  let publicInputs = inputData.publicInputs;
  let maskedMap = new Map(JSON.parse(inputData.maskedLengths));

  var mainArgs = [];
  let privateIndices = [];

  let totalArgumentCount =
    inputData.publicInputs.length + maskedMap.size ;
  for (let i = 0; i < totalArgumentCount; i++) {
    if (maskedMap.has(i)) {
      let argLength = maskedMap.get(i);
      if (inputData.indicesHex.includes(i)) {
        mainArgs.push({ hex: "f".repeat(argLength) });
      } else if (inputData.indicesInt64.includes(i)) {
        const onesStr = "1".repeat(argLength);
        mainArgs.push({ i64: parseInt(onesStr, 10) });
      } else mainArgs.push({ str: "#".repeat(argLength) });
      privateIndices.push(i + 1);
    } else if (publicInputs.length > 0) {
      if (inputData.indicesHex.includes(i)) {
        mainArgs.push({ hex: publicInputs.shift() });
      } else if (inputData.indicesInt64.includes(i)) {
        mainArgs.push({ i64: parseInt(publicInputs.shift(), 10) });
      } else mainArgs.push({ str: publicInputs.shift() });
    }
  }

  if (inputData.packingSize)
    packingSize = inputData.packingSize;

  let wasmPath = `modules/${application}.wasm`;

  let argJson = {
    "program": wasmPath,
    "shader-path": "shader",
    "packing": packingSize,
    "private-indices": privateIndices,
    "args": mainArgs,
  };

  while (!Module["FS"].analyzePath("proof.data").exists) {
    await new Promise((r) => setTimeout(r, 100));
  }

  callMain([JSON.stringify(argJson)]);
}

function getDelimiterPos(data, start) {
  // find the next delimiter position in 'data' arraybuffer after the 'start' index
  if (start >= 0) {
    var posFount = false;
    for (let i = start; i < data.length; i++) {
      for (let j = 0; j < delimiter.length; j++) {
        if (data[i + j] != delimiter[j]) break;
        if (j == delimiter.length - 1) posFount = true;
      }
      if (posFount == true) return i;
    }
  }
  return -1;
}

function sendFileWs(path, address = wssServerUrl) {
  try {
    let content = Module["FS"].readFile(path);
    if (address.startsWith("wss://"))
      sendData(content, path, address);
    else {
      console.log("Invalid Websocket address");
    }
  } catch (error) {
    console.log(error);
    return;
  }
}


async function sendFileRest(path, address, description = "") {
  let content = Module["FS"].readFile(path);
  const response = await fetch(address, {
      method: 'POST',
      body: JSON.stringify({
          description: description,
          data: Array.from(content)
      }),
      headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    self.postMessage({
      target: "server", status: "error",
      message: "File upload failed",
    });
    return;
  }

  self.postMessage({
    target: "server", status: "success",
    message: "File upload succesful",
  });
}

function sendData(content, description, address = wssServerUrl) {
  let socket = new WebSocket(address);

  socket.onopen = function (e) {
    var buffArray = [];
    var currentPos = 0;
    var totalLength = 0;
    try {
      if (description == "custom.cpp") {
        buffArray.push(UTF8Encoder.encode("source"));
      } else if (description == "custom.circom") {
        buffArray.push(UTF8Encoder.encode("source_circom"));
      } else if (description == "custom.rs") {
        buffArray.push(UTF8Encoder.encode("source_rust"));
      } else if (description == "prover_data") {
        buffArray.push(UTF8Encoder.encode("prover_data"));
        buffArray.push(delimiter);
      } else {
        if (description == "verifier_data") {
        } else {
          buffArray.push(UTF8Encoder.encode("data"));
        }
        buffArray.push(delimiter);
        buffArray.push(UTF8Encoder.encode(JSON.stringify(inputData)));
      }
      buffArray.push(delimiter);
      buffArray.push(new Uint8Array(content.buffer));
      buffArray.push(delimiter);
      if (description.startsWith("custom.")) {
        buffArray.push(UTF8Encoder.encode(ligetronVer));
        buffArray.push(delimiter);
      } else {
        try {
          content = Module["FS"].readFile("/modules/custom.wasm");
          buffArray.push(new Uint8Array(content.buffer));
          buffArray.push(delimiter);
        } catch (error) {
          console.log(error);
        }
      }

      for (const arr of buffArray) totalLength += arr.length;

      let toSend = new Uint8Array(totalLength);
      for (const arr of buffArray) {
        toSend.set(arr, currentPos);
        currentPos += arr.length;
      }

      socket.binaryType = "arraybuffer";
      socket.send(toSend);
    } catch (error) {
      console.log(error);
    }
  };

  socket.onmessage = function (event) {
    var dataValid = false;
    const recData = new Uint8Array(event.data);
    if (
      recData.length > 0 &&
      UTF8Decoder.decode(recData.subarray(-delimiter.length)) == "\r\n\r\n"
    ) {
      var delimIndex = getDelimiterPos(recData, 0);
      if (delimIndex > 0) {
        var tagData = new Uint8Array(recData.subarray(0, delimIndex));
        var msgIndex = delimIndex + delimiter.length;
        delimIndex = getDelimiterPos(recData, msgIndex);
        if (delimIndex > 0) {
          var tag = UTF8Decoder.decode(tagData);
          if (tag == "error") {
            dataValid = true;
            let errorMsg = new Uint8Array(
              recData.subarray(msgIndex, delimIndex)
            );
            self.postMessage({
              target: "server", status: "error",
              message: UTF8Decoder.decode(errorMsg),
            });
          } else if (tag == "id") {
            dataValid = true;
            let result = "";
            let idData = new Uint8Array(recData.subarray(msgIndex, delimIndex));
            let resultIndex = delimIndex + delimiter.length;
            if (resultIndex < recData.length) {
              delimIndex = getDelimiterPos(recData, resultIndex);
              let resultData = new Uint8Array(
                recData.subarray(resultIndex, delimIndex)
              );
              result = UTF8Decoder.decode(resultData);
            }
            self.postMessage({
              target: "proofId",
              id: UTF8Decoder.decode(idData),
              result: result,
            });
          } else if (tag == "wasm") {
            dataValid = true;
            let watText = "";
            try {
              let wasmData = new Uint8Array(
                recData.subarray(msgIndex, delimIndex)
              );
              let watIndex = delimIndex + delimiter.length;
              delimIndex = getDelimiterPos(recData, watIndex);
              if (delimIndex > 0) {
                let watData = new Uint8Array(
                  recData.subarray(watIndex, delimIndex)
                );
                watText = UTF8Decoder.decode(watData);
              }
              Module["FS"].writeFile("/modules/custom.wasm", wasmData);
              self.postMessage({
                target: "wasm",
                status: "success",
                wasmData: wasmData,
                watText: watText,
              });
            } catch (error) {
              self.postMessage({
                target: "wasm",
                status: "error",
              });
            }
          }
        }
      }
    }
    if (!dataValid) {
      self.postMessage({ target: "server", status: "error", message: "Invalid data recieved." });
    }
    socket.close();
  };

  socket.onclose = function (event) {
    if (event.wasClean) {
      //  console.log(`Connection closed cleanly`);
    } else {
      self.postMessage({
        target: "alert",
        content: `Connection died: ${event.code} reason: ${event.reason}`,
        enableSend: true,
      });
    }
  };

  socket.onerror = function (error) {
    console.log(error);
  };
}

function downloadProof() {
  var content;
  var buffArray = [];
  var currentPos = 0;
  var totalLength = 0;

  try {
    content = Module["FS"].readFile("proof.data");
  } catch (error) {
    console.log(error);
    return;
  }

  buffArray.push(UTF8Encoder.encode("data"));
  buffArray.push(delimiter);
  buffArray.push(UTF8Encoder.encode(JSON.stringify(inputData)));
  buffArray.push(delimiter);
  buffArray.push(new Uint8Array(content.buffer));
  buffArray.push(delimiter);
  try {
    content = Module["FS"].readFile("/modules/custom.wasm");
    buffArray.push(new Uint8Array(content.buffer));
    buffArray.push(delimiter);
  } catch (error) {
    console.log(error);
    return;
  }

  for (const arr of buffArray) totalLength += arr.length;

  let toSend = new Uint8Array(totalLength);
  for (const arr of buffArray) {
    toSend.set(arr, currentPos);
    currentPos += arr.length;
  }

  self.postMessage({
    target: "downloadProof",
    content: toSend,
  });
}

function extractData(recievedBuffer) {
  var extractedData = [];
  var recievedData = new Uint8Array(recievedBuffer);
  var delimIndex;
  var sectionIndex = 0;

  // Valid data must end with delimiter, otherwise it is corrupted
  if (
    recievedData.length > 0 &&
    UTF8Decoder.decode(recievedData.subarray(-delimiter.length)) == "\r\n\r\n"
  ) {
    var sectionCount = 0;

    do {
      delimIndex = getDelimiterPos(recievedData, sectionIndex);

      var section = recievedData.subarray(sectionIndex, delimIndex);
      if (section.length > 0)
        extractedData.push(recievedData.subarray(sectionIndex, delimIndex));

      sectionIndex = delimIndex + delimiter.length;
      sectionCount++;
    } while (sectionIndex < recievedData.length - 1);
  }
  return extractedData;
}

function requestProofFile(args) {
  let socket = new WebSocket(wssServerUrl);

  socket.onopen = function (e) {
    const buf1 = UTF8Encoder.encode("id");
    const buf2 = UTF8Encoder.encode(args.proofId);

    let toSend = new Uint8Array(
      buf1.byteLength + 2 * delimiter.byteLength + buf2.byteLength
    );
    toSend.set(new Uint8Array(buf1), 0);
    toSend.set(new Uint8Array(delimiter), buf1.byteLength);
    toSend.set(new Uint8Array(buf2), buf1.byteLength + delimiter.byteLength);
    toSend.set(
      new Uint8Array(delimiter),
      buf1.byteLength + buf2.byteLength + delimiter.byteLength
    );

    socket.binaryType = "arraybuffer";
    socket.send(toSend);
  };

  socket.onmessage = function (event) {
    var dataValid = false;
    const recData = new Uint8Array(event.data);
    const dataCollection = extractData(recData);

    if (dataCollection.length >= 2) {
      const tag = UTF8Decoder.decode(dataCollection[0]);
      if (tag == "error") {
        const errorMsg = UTF8Decoder.decode(dataCollection[1]);
        self.postMessage({ target: "server", status: "error", message: errorMsg });
        socket.close();
        return;
      } else if (tag == "data" && dataCollection.length >= 4) {
        const proofId = UTF8Decoder.decode(dataCollection[1]);
        if (proofId != args.proofId) {
          console.log("Data file with wrong ID recieved.");
          socket.close();
          return;
        }
        try {
          let inputDataEnc = new Uint8Array(dataCollection[2]);
          inputData = JSON.parse(UTF8Decoder.decode(inputDataEnc));
          if (
            inputData &&
            (inputData.publicInputs.length != 0 ||
              inputData.maskedLengths.length != 0)
          ) {
            var proofData = new Uint8Array(dataCollection[3]);
            Module["FS"].writeFile("proof.data", proofData);
            if (dataCollection.length == 5) {
              dataValid = true;
              var wasmData = new Uint8Array(dataCollection[4]);
              Module["FS"].writeFile("/modules/custom.wasm", wasmData);
            }

            if (dataValid) {
              self.postMessage({
                target: "inputArgs",
                args: inputData,
              });
            }
          }
        } catch (error) {
          console.log(error);
          if (!error instanceof SyntaxError) {
            // we will send the error for the invalid JSON file as "Invalid data recieved" error below
            socket.close();
            return;
          }
        }
      }
    }
    if (!dataValid)
      self.postMessage({ target: "server", status: "error", message: "Invalid data recieved!" });

    socket.close();
  };

  socket.onclose = function (event) {
    if (event.wasClean) {
      //  console.log(`Connection closed cleanly`);
    } else {
      self.postMessage({
        target: "alert",
        content: `Connection died: ${event.code} reason: ${event.reason}`,
      });
    }
  };

  socket.onerror = function (error) {
    console.warn(error);
  };
}

function uploadProofFile(content) {
  var dataValid = false;
  const recData = new Uint8Array(content);
  const dataCollection = extractData(recData);

  if (dataCollection.length >= 2) {
    const tag = UTF8Decoder.decode(dataCollection[0]);
    if (tag == "data" && dataCollection.length >= 3) {
      try {
        let inputDataEnc = new Uint8Array(dataCollection[1]);
        inputData = JSON.parse(UTF8Decoder.decode(inputDataEnc));
        if (
          inputData &&
          (inputData.publicInputs.length != 0 ||
            inputData.maskedLengths.length != 0)
        ) {
          if (dataCollection.length == 3) {
            dataValid = true;
            var proofData = new Uint8Array(dataCollection[2]);
            Module["FS"].writeFile("proof.data", proofData);
            proofData = new Uint8Array(dataCollection[3]);
            Module["FS"].writeFile("/modules/custom.wasm", proofData);
            self.postMessage({
              target: "inputArgs",
              args: inputData,
            });
          }
        }
      } catch (error) {
        console.log(error);
        if (!error instanceof SyntaxError) {
          // we will send the error for the invalid JSON file as "Invalid data recieved" error below
          return;
        }
      }
    }
  }
  if (!dataValid)
    self.postMessage({ target: "server", status: "error", message: "Invalid data recieved!" });
}

async function saveFile(content, path) {
  try {
    let data = new Uint8Array(content);
    while (!Module["FS"].analyzePath("/modules").exists) {
      await new Promise((r) => setTimeout(r, 100));
    }
    Module["FS"].writeFile(path, data);
    if (!isProver) self.postMessage({ target: "file_written", path: path });
  } catch (error) {
    console.log(error);
  }
}

onmessage = async function (message) {
  switch (message.data.target) {
    case "setWssUrl": {
      wssServerUrl = `wss://${message.data.url}`;
      break;
    }
    case "createProof": {
      let application = message.data.application ? message.data.application : "custom";
      createProof(message.data.argData, application, message.data.executeOnServer);
      break;
    }
    case "sendProof": {
      sendFileWs("proof.data");
      break;
    }
    case "sendFileWs": {
      let address = message.data.address ? message.data.address : wssServerUrl;
      sendFileWs(address, message.data.path);
      break;
    }
    case "sendFileRest": {
      await sendFileRest(message.data.path, message.data.address, message.data.description);
      break;
    }
    case "downloadProof": {
      downloadProof();
      break;
    }
    case "getProof": {
      requestProofFile(message.data.args);
      break;
    }
    case "uploadProof": {
      uploadProofFile(message.data.content);
      break;
    }
    case "sendData": {
      let content;
      if (message.data.type == "text")
        content = UTF8Encoder.encode(message.data.content);
      else content = message.data.content;
      sendData(content, message.data.description);
      break;
    }
    case "saveFile": {
      await saveFile(message.data.content, message.data.path);
      if (!isProver && message.data.inputData)
        inputData = message.data.inputData;
      break;
    }
    case "local_verification": {
      let  application = message.data.application ? message.data.application : "custom";
      await verifyLocalProof(message.data.args, application);
      break;
    }
    case "verify": {
      let  application = message.data.application ? message.data.application : "custom";
      await verifyRecievedProof(application);
      break;
    }
    case "setPackingSize": {
      packingSize = message.data.value;
      break;
    }
    default:
      throw "wha? " + message.data.target;
  }
};

self.postMessage({
  target: "runtimeInitiated",
  workerRole: isProver ? "prover" : "verifier",
  ligetronVer: ligetronVer,
});
