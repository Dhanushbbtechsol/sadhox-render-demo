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

export type StatusChangedEmailProps = {
  ticketId: string;
  ticketTitle: string;
  previousStatus: string;
  newStatus: string;
  actorName: string;
  remarks?: string;
  ticketUrl?: string;
};

export function StatusChangedEmail({
  ticketId,
  ticketTitle,
  previousStatus,
  newStatus,
  actorName,
  remarks,
  ticketUrl = "http://localhost:5173",
}: StatusChangedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Status changed: {previousStatus} → {newStatus}
      </Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Heading style={emailStyles.h1}>Status updated</Heading>
          <Text style={emailStyles.text}>
            Ticket <strong>{ticketId}</strong> — {ticketTitle}
          </Text>
          <Text style={emailStyles.row}>
            <strong>{previousStatus}</strong> → <strong>{newStatus}</strong>
          </Text>
          <Text style={emailStyles.row}>Updated by {actorName}</Text>
          {remarks ? <Text style={emailStyles.text}>Remarks: {remarks}</Text> : null}
          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.button} href={ticketUrl}>
              View ticket
            </Button>
          </Section>
          <Text style={emailStyles.muted}>Yukti ITSM notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default StatusChangedEmail;
