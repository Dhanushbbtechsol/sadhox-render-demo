/** @jsxImportSource react */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { emailStyles } from "./styles";

export type RequestDecisionEmailProps = {
  requestId: string;
  requestTitle: string;
  decision: "Approved" | "Rejected";
  comments?: string;
  actorName?: string;
  requestUrl?: string;
};

export function RequestDecisionEmail({
  requestId,
  requestTitle,
  decision,
  comments,
  actorName,
  requestUrl = "http://localhost:5173",
}: RequestDecisionEmailProps) {
  const approved = decision === "Approved";
  return (
    <Html>
      <Head />
      <Preview>
        Request {decision.toLowerCase()}: {requestTitle}
      </Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Heading style={emailStyles.h1}>Request {decision.toLowerCase()}</Heading>
          <Text style={emailStyles.text}>
            Service request <strong>{requestId}</strong> — {requestTitle}
          </Text>
          <Text
            style={{
              ...emailStyles.banner,
              backgroundColor: approved ? "#dcfce7" : "#fee2e2",
              border: approved ? "1px solid #bbf7d0" : "1px solid #fecaca",
              color: approved ? "#166534" : "#991b1b",
            }}
          >
            Decision: {decision}
            {actorName ? ` by ${actorName}` : ""}
          </Text>
          {comments ? <Text style={emailStyles.text}>Comments: {comments}</Text> : null}
          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.button} href={requestUrl}>
              View request
            </Button>
          </Section>
          <Text style={emailStyles.muted}>Sadhox ITSM notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default RequestDecisionEmail;
