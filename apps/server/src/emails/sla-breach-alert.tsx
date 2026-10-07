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
import { emailStyles, priorityBadgeColor } from "./styles";

export type SlaBreachAlertEmailProps = {
  ticketId: string;
  ticketTitle: string;
  priority: string;
  breachType: "response" | "resolve";
  escalationNotes?: string;
  ticketUrl?: string;
};

export function SlaBreachAlertEmail({
  ticketId,
  ticketTitle,
  priority,
  breachType,
  escalationNotes,
  ticketUrl = "http://localhost:5173",
}: SlaBreachAlertEmailProps) {
  const target = breachType === "response" ? "response" : "resolution";
  return (
    <Html>
      <Head />
      <Preview>SLA {target} breach: {ticketTitle}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Heading style={emailStyles.h1}>SLA breach alert</Heading>
          <Text style={emailStyles.banner}>
            SLA {target} target missed for ticket {ticketId}
          </Text>
          <Text style={emailStyles.row}>
            <span
              style={{
                ...emailStyles.badge,
                backgroundColor: priorityBadgeColor(priority),
              }}
            >
              {priority}
            </span>
          </Text>
          <Text style={emailStyles.text}>
            <strong>{ticketTitle}</strong>
          </Text>
          {escalationNotes ? (
            <Text style={emailStyles.text}>Escalation: {escalationNotes}</Text>
          ) : (
            <Text style={emailStyles.text}>
              Please review and escalate according to priority policy.
            </Text>
          )}
          <Section style={emailStyles.buttonContainer}>
            <Button style={emailStyles.button} href={ticketUrl}>
              Open ticket
            </Button>
          </Section>
          <Text style={emailStyles.muted}>Yukti ITSM urgent notification</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SlaBreachAlertEmail;
