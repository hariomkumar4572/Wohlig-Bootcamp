const { z } = require("zod");

const ContactCardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\d{10}$/, "Phone must contain exactly 10 digits"),
  address: z.object({
    city: z.string().min(1, "City is required"),
    pincode: z.string().regex(/^\d{6}$/, "Pincode must contain exactly 6 digits")
  })
});

module.exports = { ContactCardSchema };
