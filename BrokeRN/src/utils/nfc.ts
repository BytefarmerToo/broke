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

interface NfcTag {
  ndefMessage?: Array<{ payload: number[] }>;
}

const handleTag = (
  tag: NfcTag | null
): {
  success: boolean;
  isValid: boolean;
  message?: string;
} => {
  if (!tag?.ndefMessage || tag.ndefMessage.length === 0) {
    return {
      success: true,
      isValid: false,
      message: "No NDEF message found on tag",
    };
  }

  try {
    const record = tag.ndefMessage[0];
    const payload = Ndef.text.decodePayload(new Uint8Array(record.payload));
    const isValid = payload === NFC_PAYLOAD;
    return {
      success: true,
      isValid,
      message: isValid
        ? "Valid Broke tag detected"
        : "Invalid tag - not a Broke tag",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      isValid: false,
      message: `Error reading tag: ${message}`,
    };
  }
};

export async function readNfcTag(): Promise<{
  success: boolean;
  isValid: boolean;
  message?: string;
}> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    return handleTag(tag as NfcTag | null);
  } catch (ex: unknown) {
    const message = ex instanceof Error ? ex.message : "";
    if (message.includes("cancelled")) {
      return { success: false, isValid: false, message: "NFC read cancelled" };
    }
    return { success: false, isValid: false, message: "NFC read error" };
  } finally {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("cancelled")) {
      return { success: false, message: "NFC write cancelled" };
    }
    return { success: false, message: `NFC write error: ${message || "Unknown error"}` };
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

export function cleanupNfc() {
  NfcManager.cancelTechnologyRequest();
}
