/**
 * ServiceModals — reusable full-screen modals for the Official Service section.
 *
 * Exported components:
 *   WarrantyModal     — scrollable warranty policy
 *   ShippingModal     — scrollable shipping policy
 *   ContactUsModal    — HQ address, phone, email (clickable via Linking)
 *   FeedbackModal     — radio-button topic list + submit CTA
 *
 * Usage (from ProfileScreen):
 *   const [modal, setModal] = useState<'warranty'|'shipping'|'contact'|'feedback'|null>(null);
 *   <WarrantyModal  visible={modal === 'warranty'}  onClose={() => setModal(null)} />
 *   ...etc
 */

import React, { useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, Linking,
  StyleSheet, Platform, StatusBar, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// ─── Shared modal shell ───────────────────────────────────────────────────────
function ModalShell({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={shell.safe}>
        {/* Sticky header */}
        <View style={shell.header}>
          <View style={{ width: 36 }} />
          <Text style={shell.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={shell.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={22} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={shell.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const shell = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#fff',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 20, paddingBottom: 50 },
});

// ─── Typography helpers ───────────────────────────────────────────────────────
function SectionHead({ text }: { text: string }) {
  return <Text style={typo.head}>{text}</Text>;
}

function Para({ text }: { text: string }) {
  return <Text style={typo.para}>{text}</Text>;
}

function Bullet({ label, text }: { label: string; text: string }) {
  return (
    <View style={typo.bulletRow}>
      <Text style={typo.bulletDot}>•</Text>
      <Text style={typo.bulletBody}>
        <Text style={typo.bold}>{label}</Text>
        {text}
      </Text>
    </View>
  );
}

const typo = StyleSheet.create({
  head: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  para: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: { color: '#8EE53F', fontWeight: '800', marginRight: 8, marginTop: 2, fontSize: 14 },
  bulletBody: { flex: 1, fontSize: 14, color: '#444', lineHeight: 22 },
  bold: { fontWeight: '700', color: '#000' },
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. WARRANTY MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function WarrantyModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <ModalShell visible={visible} title="Warranty Policy" onClose={onClose}>
      <SectionHead text="Overview" />
      <Para text="All products purchased from Vortex Shop are covered by a manufacturer's warranty. The warranty period and coverage depend on the product category and brand." />

      <SectionHead text="Standard Warranty" />
      <Bullet label="Electronics: " text="12 months from date of purchase." />
      <Bullet label="Accessories: " text="6 months from date of purchase." />
      <Bullet label="Batteries & Cables: " text="3 months from date of purchase." />

      <SectionHead text="What Is Covered" />
      <Para text="The warranty covers manufacturing defects and component failures under normal use conditions. This includes hardware malfunctions not caused by physical damage or misuse." />

      <SectionHead text="What Is NOT Covered" />
      <Bullet label="Physical damage: " text="Cracked screens, dents, or broken parts." />
      <Bullet label="Water damage: " text="Unless IPX rating covers it." />
      <Bullet label="Unauthorised repairs: " text="Opening the device voids warranty." />
      <Bullet label="Consumables: " text="Batteries after 3-month period, ear tips, etc." />

      <SectionHead text="How to Claim" />
      <Para text="To initiate a warranty claim, contact our service team via the 'Contact Us' section. You will need your order number and proof of purchase. Our team will guide you through the return and replacement process." />

      <SectionHead text="Turnaround Time" />
      <Para text="Warranty assessments are typically completed within 5–10 business days. If your claim is approved, a replacement or repaired unit will be dispatched within 2–3 business days." />
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SHIPPING MODAL
// ─────────────────────────────────────────────────────────────────────────────
export function ShippingModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <ModalShell visible={visible} title="Shipping Policy" onClose={onClose}>
      <SectionHead text="Delivery Areas" />
      <Para text="We currently deliver to all major towns and cities in Uganda. Nationwide delivery is available, with delivery times varying by location." />

      <SectionHead text="Delivery Timeframes" />
      <Bullet label="Kampala & Greater Kampala: " text="Same-day delivery (orders placed before 12:00 PM)." />
      <Bullet label="Upcountry towns: " text="2–4 business days." />
      <Bullet label="Remote areas: " text="4–7 business days." />

      <SectionHead text="Shipping Fees" />
      <Bullet label="Orders under UGX 50,000: " text="Flat rate of UGX 5,000." />
      <Bullet label="Orders of UGX 50,000 and above: " text="Free shipping within Kampala." />
      <Bullet label="Upcountry: " text="Calculated at checkout based on weight and location." />

      <SectionHead text="Order Tracking" />
      <Para text="Once your order is dispatched, you will receive an SMS notification with a tracking code. You can track your order under 'My Orders' in your profile." />

      <SectionHead text="Failed Deliveries" />
      <Para text="If a delivery attempt fails because the recipient was unavailable, our rider will try again the next business day. After two failed attempts, the order may be returned to our warehouse." />

      <SectionHead text="Damaged Goods" />
      <Para text="If you receive a damaged item, please photograph it immediately and contact us within 24 hours via our Contact Us page. We will arrange a replacement or full refund." />
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONTACT US MODAL
// ─────────────────────────────────────────────────────────────────────────────
const PHONE    = '+256 700 123 456';
const ALT_PHONE = '+256 414 999 888';
const EMAIL    = 'support@vortexshop.ug';

export function ContactUsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const openDialer = (n: string) =>
    Linking.openURL(`tel:${n.replace(/\s/g, '')}`).catch(() =>
      Alert.alert('Cannot Open', 'Unable to open the dialer on this device.'),
    );

  const openMail = () =>
    Linking.openURL(`mailto:${EMAIL}`).catch(() =>
      Alert.alert('Cannot Open', 'Unable to open the mail app on this device.'),
    );

  return (
    <ModalShell visible={visible} title="Contact Us" onClose={onClose}>
      {/* HQ Address */}
      <SectionHead text="Headquarters Address" />
      <View style={contactStyles.row}>
        <Feather name="map-pin" size={16} color="#8EE53F" style={contactStyles.icon} />
        <Text style={contactStyles.body}>
          Vortex Shop Ltd{'\n'}Plot 14, Kampala Road{'\n'}Kampala, Uganda
        </Text>
      </View>

      {/* Office Address */}
      <SectionHead text="Service Centre" />
      <View style={contactStyles.row}>
        <Feather name="home" size={16} color="#8EE53F" style={contactStyles.icon} />
        <Text style={contactStyles.body}>
          Ground Floor, Nakawa Business Park{'\n'}Port Bell Road, Nakawa{'\n'}Kampala, Uganda
        </Text>
      </View>

      {/* Phone */}
      <SectionHead text="Service Phone" />
      <View style={contactStyles.row}>
        <Feather name="phone" size={16} color="#8EE53F" style={contactStyles.icon} />
        <View>
          <TouchableOpacity onPress={() => openDialer(PHONE)}>
            <Text style={contactStyles.link}>{PHONE}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openDialer(ALT_PHONE)} style={{ marginTop: 6 }}>
            <Text style={contactStyles.link}>{ALT_PHONE}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Email */}
      <SectionHead text="Email" />
      <View style={contactStyles.row}>
        <Feather name="mail" size={16} color="#8EE53F" style={contactStyles.icon} />
        <TouchableOpacity onPress={openMail}>
          <Text style={contactStyles.link}>{EMAIL}</Text>
        </TouchableOpacity>
      </View>

      {/* Hours */}
      <SectionHead text="Operating Hours" />
      <View style={contactStyles.row}>
        <Feather name="clock" size={16} color="#8EE53F" style={contactStyles.icon} />
        <Text style={contactStyles.body}>
          Monday – Friday: 8:00 AM – 6:00 PM{'\n'}
          Saturday: 9:00 AM – 4:00 PM{'\n'}
          Sunday & Public Holidays: Closed
        </Text>
      </View>
    </ModalShell>
  );
}

const contactStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  icon: { marginRight: 10, marginTop: 2 },
  body: { fontSize: 14, color: '#444', lineHeight: 22 },
  link: { fontSize: 14, color: '#1565C0', fontWeight: '600', textDecorationLine: 'underline', lineHeight: 22 },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FEEDBACK / SUGGESTION MODAL
// ─────────────────────────────────────────────────────────────────────────────
const FEEDBACK_TOPICS = [
  'Order Management',
  'Payment Issues',
  'Product Quality',
  'Delivery Experience',
  'App Performance',
  'Customer Service',
  'Feature Requests',
  'Other',
];

export function FeedbackModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!selected) {
      Alert.alert('Select a Topic', 'Please select a feedback topic before submitting.');
      return;
    }
    Alert.alert('Thank You!', `Your feedback on "${selected}" has been received. We appreciate it!`, [
      { text: 'Close', onPress: onClose },
    ]);
    setSelected(null);
  };

  return (
    <ModalShell visible={visible} title="Feedback & Suggestions" onClose={onClose}>
      <Text style={feedbackStyles.intro}>
        Select a topic below. Your feedback helps us improve the Vortex Shop experience.
      </Text>

      {FEEDBACK_TOPICS.map(topic => {
        const active = selected === topic;
        return (
          <TouchableOpacity
            key={topic}
            style={[
              feedbackStyles.topicRow,
              active && feedbackStyles.topicRowActive,
            ]}
            onPress={() => setSelected(active ? null : topic)}
            activeOpacity={0.75}
          >
            <Text style={[feedbackStyles.topicTxt, active && { color: '#000', fontWeight: '700' }]}>
              {topic}
            </Text>

            {/* Radio button */}
            <View
              style={[
                feedbackStyles.radio,
                active && { borderColor: '#8EE53F', borderWidth: 2 },
              ]}
            >
              {active && <View style={feedbackStyles.radioFill} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[feedbackStyles.submitBtn, { opacity: selected ? 1 : 0.45 }]}
        onPress={handleSubmit}
        activeOpacity={0.85}
      >
        <Text style={feedbackStyles.submitTxt}>Submit Feedback</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}

const feedbackStyles = StyleSheet.create({
  intro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginBottom: 20,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  topicRowActive: { backgroundColor: '#F7FFF0', borderBottomColor: '#D4F0AC' },
  topicTxt: { fontSize: 15, color: '#444', flex: 1 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8EE53F',
  },
  submitBtn: {
    backgroundColor: '#111',
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
