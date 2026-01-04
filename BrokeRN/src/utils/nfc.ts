import NfcManager, { NfcTech, Ndef } from "react-native-nfc-manager";

const NFC_PAYLOAD = "BROKE-IS-GREAT";

export async function initNfc(): Promise<boolean> {
  try {
    const isSupported = await NfcManager.isSupported();
    if (isSupported) {
      await NfcManager.start();
    }
    return isSupported;
  } catch (error) {
    console.error("NFC init error:", error);
    return false;
  }
}

const handleTag = (
  tag: any
): {
  success: boolean;
  isValid: boolean;
  message?: string;
} => {
  console.warn("Handling tag start", tag);
  if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
    console.warn("No NDEF message found on tag");
    return {
      success: true,
      isValid: false,
      message: "No NDEF message found on tag",
    };
  }

  try {
    const record = tag.ndefMessage[0];
    console.warn("NDEF Record:", record);
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
    console.warn("Payload:", payload);
    const isValid = payload === NFC_PAYLOAD;
    console.warn("Is Valid:", isValid);
    return {
      success: true,
      isValid,
      message: isValid
        ? "Valid Broke tag detected"
        : "Invalid tag - not a Broke tag",
    };
  } catch (error: any) {
    return {
      success: false,
      isValid: false,
      message: `Error reading tag: ${error.message}`,
    };
  }
};

export async function readNfcTag(): Promise<{
  success: boolean;
  isValid: boolean;
  message?: string;
}> {
  try {
    // register for the NFC tag with NDEF in it
    console.warn("Requesting NFC technology");
    await NfcManager.requestTechnology(NfcTech.Ndef);
    // the resolved tag object will contain `ndefMessage` property
    console.warn("Waiting for tag");
    const tag = await NfcManager.getTag();
    console.warn("Tag found", tag);
    return handleTag(tag);
  } catch (ex: any) {
    console.warn("NFC read error", ex);
    if (ex?.message?.includes("cancelled")) {
      return { success: false, isValid: false, message: "NFC read cancelled" };
    }
    return { success: false, isValid: false, message: "NFC read error" };
  } finally {
    // stop the nfc scanning
    NfcManager.cancelTechnologyRequest();
  }
}

export async function writeNfcTag(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);

    const bytes = Ndef.encodeMessage([Ndef.textRecord(NFC_PAYLOAD)]);

    if (bytes) {
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      return { success: true, message: "Tag written successfully!" };
    }

    return { success: false, message: "Failed to encode message" };
  } catch (error: any) {
    if (error.message?.includes("cancelled")) {
      return { success: false, message: "NFC write cancelled" };
    }
    return { success: false, message: `NFC write error: ${error.message}` };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export function cleanupNfc() {
  NfcManager.cancelTechnologyRequest();
}
