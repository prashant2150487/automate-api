/* ----------  Helper: Send coupon email  ----------------------- */
async function sendCouponEmail(to, amount) {
  await transporter.sendMail({
    from: '"Your Shop" <no-reply@yourshop.com>',
    to,
    subject: `₹${amount} coupon credited to your wallet`,
    html: `<p>Dear customer,<br/>We just added a coupon worth <strong>₹${amount}</strong> to your wallet. Happy shopping!</p>`,
  });
}