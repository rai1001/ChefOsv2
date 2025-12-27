import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { VertexAI } from "@google-cloud/vertexai";

export const monitorHACCP = functions.firestore
    .document("haccpLogs/{logId}")
    .onCreate(async (snap, context) => {
        const log = snap.data();
        const pccId = log.pccId;

        const projectId = process.env.GCLOUD_PROJECT;
        if (!projectId) return null;

        // Fetch last 5 logs for context
        const lastLogsSnap = await admin.firestore()
            .collection("haccpLogs")
            .where("pccId", "==", pccId)
            .orderBy("timestamp", "desc")
            .limit(5)
            .get();

        const history = lastLogsSnap.docs.map(d => d.data());

        // Fetch PCC details to get safety limits
        const pccDoc = await admin.firestore().collection("pccs").doc(pccId).get();
        const pcc = pccDoc.data();
        const limits = pcc ? `Min Temp: ${pcc.minTemp ?? 'N/A'}, Max Temp: ${pcc.maxTemp ?? 'N/A'}` : "Unknown limits";

        const vertexAI = new VertexAI({ project: projectId, location: "europe-west1" });
        const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
      Analyze these temperature logs for a refrigeration unit (PCC).
      Limits: ${limits}
      Newest log: ${JSON.stringify(log)}
      History: ${JSON.stringify(history)}
      
      Is there an alarming trend (e.g. consistent rise in temperature) or a critical failure?
      Return JSON: { "isAnomaly": boolean, "message": "Explanation if anomaly" }
    `;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.candidates?.[0].content.parts[0].text;
            if (text) {
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const analysis = JSON.parse(cleanJson);

                if (analysis.isAnomaly) {
                    // Create an alert notification
                    await admin.firestore().collection("notifications").add({
                        type: "HACCP_ALERT",
                        message: analysis.message,
                        pccId: pccId,
                        read: false,
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Optionally update the log status
                    return snap.ref.update({ status: "WARNING", notes: analysis.message });
                }
            }
        } catch (error) {
            console.error("HACCP Monitor Error:", error);
        }
        return null;
    });
