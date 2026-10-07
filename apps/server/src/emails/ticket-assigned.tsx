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

export type TicketAssignedEmailProps = {
  ticketId: string;
  ticketTitle: string;
  assigneeName: string;
  priority?: string;
  ticketUrl?: string;
};

export function TicketAssignedEmail({
  ticketId,
  ticketTitle,
  assigneeName,
  priority = "P3",
  ticketUrl = "http://localhost:5173",
}: TicketAssignedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Ticket assigned: {ticketTitle}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <Heading style={emailStyles.h1}>Ticket assigned</Heading>
          <Text style={emailStyles.text}>Hi {assigneeName},</Text>
          <Text style={emailStyles.text}>
            You have been assigned ticket <strong>{ticketId}</strong>.
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

export default TicketAssignedEmail;
