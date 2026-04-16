// @ts-nocheck
// src/lib/product-data.ts
// Legacy one-time seed data. Kept only so scripts/migrate.ts can re-seed.
// Category and tags fields on these objects are ignored by the current schema.
import { Product } from "@/types";

const promo_ExoSbooster = {
  id: "p1",
  title: "Promo Regeneración",
  totalPrice: 350000,
  isPromo: true,
  items: [
    {
      id: "SBOOSTER PDRN+",
      name: "S-Booster Plus",
      quantity: 2,
      pricePerUnit: 65000,
    },
    { id: "EXOGLOW", name: "Exoglow", quantity: 2, pricePerUnit: 110000 },
  ],
};

const promo_RejeunesseExo = {
  id: "p2",
  title: "Promo Voluminización",
  totalPrice: 470000,
  isPromo: true,
  items: [
    {
      id: "REJEUNESSE",
      name: "Rejeunesse",
      quantity: 4,
      pricePerUnit: 95000,
      matchBy: "brand",
    },
    { id: "EXOGLOW", name: "ExoGlow", quantity: 1, pricePerUnit: 90000 },
  ],
};

const promo_Full = {
  id: "p3",
  title: "Promo Full Face",
  totalPrice: 950000,
  isPromo: true,
  items: [
    {
      id: "Xela Rederm 1.1%",
      name: "Xela Rederm 1.1%",
      quantity: 3,
      pricePerUnit: 140000,
    },
    {
      id: "Fulloria",
      name: "Fulloria",
      quantity: 2,
      pricePerUnit: 185000,
    },
    {
      id: "SBOOSTER PDRN+",
      name: "S-Booster Plus",
      quantity: 2,
      pricePerUnit: 22500,
    },
    { id: "EXOGLOW", name: "Exoglow", quantity: 1, pricePerUnit: 115000 },
  ],
};

const promo_RejeunesseSbooster = {
  id: "p4",
  title: "Promo Relleno y Bioreparación",
  totalPrice: 500000,
  isPromo: true,
  items: [
    {
      id: "REJEUNESSE",
      name: "Rejeunesse",
      quantity: 4,
      pricePerUnit: 95000,
      matchBy: "brand",
    },
    {
      id: "SBOOSTER PDRN+",
      name: "S-Booster Plus",
      quantity: 2,
      pricePerUnit: 60000,
    },
  ],
};

const promo_FulloriaSboosterCanulas = {
  id: "p5",
  title: "Promo Bioregeneración Plus",
  totalPrice: 470000,
  isPromo: true,
  items: [
    {
      id: "Fulloria",
      name: "Fulloria",
      quantity: 2,
      pricePerUnit: 185000,
    },
    {
      id: "SBOOSTER PDRN+",
      name: "S-Booster Plus",
      quantity: 2,
      pricePerUnit: 47500,
    },
    {
      id: "25G",
      brand: "Mirror Soft",
      name: "Cánulas 25G",
      quantity: 2,
      pricePerUnit: 2500,
      notes: "Cualquier tamaño",
      matchBy: "nameContains",
    },
  ],
};

const promo_XelaSbooster = {
  id: "p6",
  title: "Promo Redermalización",
  totalPrice: 520000,
  isPromo: true,
  items: [
    {
      id: "Xela Rederm 1.1%",
      name: "Xela Rederm 1.1%",
      quantity: 3,
      pricePerUnit: 140000,
    },
    {
      id: "SBOOSTER PDRN+",
      name: "S-Booster Plus",
      quantity: 2,
      pricePerUnit: 50000,
    },
  ],
};

const promo_XelaMix = {
  id: "p7",
  title: "Promo Redermalización Mix",
  totalPrice: 460000,
  isPromo: true,
  items: [
    {
      id: "Xela Rederm 1.1%",
      name: "Xela Rederm 1.1%",
      quantity: 1,
      pricePerUnit: 130000,
    },
    {
      id: "Xela Rederm 1.8%",
      name: "Xela Rederm 1.8%",
      quantity: 1,
      pricePerUnit: 160000,
    },
    {
      id: "Xela Rederm 2.2%",
      name: "Xela Rederm 2.2%",
      quantity: 1,
      pricePerUnit: 170000,
    },
  ],
};

export const allCrossPromotions = [
  promo_ExoSbooster,
  promo_RejeunesseExo,
  promo_Full,
  promo_RejeunesseSbooster,
  promo_FulloriaSboosterCanulas,
  promo_XelaSbooster,
  promo_XelaMix,
];

export const realProducts: Product[] = [
  {
    id: "ExoGlow",
    brand: "EXOGLOW",
    name: "Exosomas Vegetales",
    category: "Exosomas",
    description:
      "ExoGlow de SUVANZA combina exosomas vegetales, PDRN y factores de crecimiento, estimulando la actividad de fibroblastos y queratinocitos para promover la síntesis de colágeno, elastina y matriz extracelular. Su acción potencia la regeneración tisular y mejora la calidad de la dermis en pieles envejecidas o dañadas. Con propiedades antiinflamatorias, antioxidantes y despigmentantes, favorece la recuperación post-procedimiento y optimiza protocolos de rejuvenecimiento y bioreparación cutánea. La biotecnología exosómica lo convierte en una herramienta confiable y eficaz para resultados clínicos visibles y sostenidos.",
    imageUrls: ["/images/products/exoglow/1.jpg"],
    priceTiers: [],
    tags: ["Featured", "New"],
    variants: [
      {
        id: "EXOGLOW",
        name: "Exosomas Vegetales",
        imageUrls: [
          "/images/products/exoglow/1.jpg",
          "/images/products/exoglow/2.jpg",
          "/images/products/exoglow/3.jpg",
          "/images/products/exoglow/4.jpg",
          "/images/products/exoglow/5.jpg",
          "/images/products/exoglow/6.jpg",
          "/images/products/exoglow/7.jpg",
          "/images/products/exoglow/8.jpg",
          "/images/products/exoglow/9.jpg",
          "/images/products/exoglow/10.jpg",
          "/images/products/exoglow/11.jpg",
          "/images/products/exoglow/12.jpg",
          "/images/products/exoglow/13.jpg",
          "/images/products/exoglow/14.jpg",
        ],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 115000 },
          { minQuantity: 2, pricePerUnit: 110000 },
          { minQuantity: 5, pricePerUnit: 100000 },
        ],
      },
    ],
    crossProductPromotions: [
      promo_ExoSbooster,
      promo_RejeunesseExo,
      promo_Full,
    ],
  },
  {
    id: "SBOOSTER PDRN+",
    brand: "S-BOOSTER Plus",
    name: "Mesoterapia con PDRN+",
    category: "Mesoterapia",
    description:
      "S-Booster Plus de SUVANZA aporta una alta concentración de PDRN, con acción directa en la estimulación de fibroblastos y reparación del ADN celular. Este mecanismo favorece la síntesis de colágeno y elastina, mejorando la densidad dérmica y promoviendo un efecto regenerador sostenido. Su potente perfil antiinflamatorio y antioxidante acelera la recuperación tisular, optimiza la oxigenación y uniformidad de la piel, y potencia los protocolos de rejuvenecimiento y revitalización cutánea. Es una herramienta confiable para médicos que buscan resultados clínicos visibles y duraderos en bioreparación dérmica.",
    imageUrls: ["/images/products/s-booster/1.jpg"],
    priceTiers: [],
    variants: [
      {
        id: "SBOOSTER PDRN+",
        name: "Mesoterapia con PDRN+",
        imageUrls: [
          "/images/products/s-booster/1.jpg",
          "/images/products/s-booster/2.jpg",
          "/images/products/s-booster/3.jpg",
          "/images/products/s-booster/4.jpg",
          "/images/products/s-booster/5.jpg",
          "/images/products/s-booster/6.jpg",
          "/images/products/s-booster/7.jpg",
          "/images/products/s-booster/8.jpg",
          "/images/products/s-booster/9.jpg",
        ],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 75000 },
          { minQuantity: 5, pricePerUnit: 70000 },
          { minQuantity: 10, pricePerUnit: 65000 },
          { minQuantity: 50, pricePerUnit: 59000 },
        ],
      },
    ],
    crossProductPromotions: [
      promo_ExoSbooster,
      promo_RejeunesseSbooster,
      promo_FulloriaSboosterCanulas,
      promo_XelaSbooster,
      promo_Full,
    ],
  },
  {
    id: "Fulloria",
    brand: "FULLORIA",
    name: "Bioregenerador",
    category: "Bioregenerador",
    tags: ["Featured"], // MODIFIED
    description:
      "FULLORIA de SUVANZA es un ácido hialurónico híbrido de alto y bajo peso molecular, diseñado para inducir una bioestimulación profunda y mejorar la calidad cutánea de manera integral. Su acción combinada favorece la hidratación inmediata, la reestructuración de la matriz extracelular y la estimulación de fibroblastos, logrando un tejido más firme y elástico. Con un protocolo en dos sesiones separadas por 28 días y mantenimiento anual, FULLORIA se posiciona como una alternativa eficaz en prevención y tratamiento del envejecimiento cutáneo, mejorando textura, luminosidad y tonicidad. Su perfil innovador lo convierte en una herramienta clave dentro de los planes médicos de rejuvenecimiento facial y corporal.",
    imageUrls: ["/images/products/fulloria/1.jpg"],
    priceTiers: [],
    variants: [
      {
        id: "Fulloria",
        name: "Bioregenerador",
        imageUrls: [
          "/images/products/fulloria/1.jpg",
          "/images/products/fulloria/2.jpg",
          "/images/products/fulloria/3.jpg",
          "/images/products/fulloria/4.jpg",
          "/images/products/fulloria/5.jpeg",
        ],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 195000 },
          { minQuantity: 2, pricePerUnit: 185000 },
          { minQuantity: 6, pricePerUnit: 165000 },
        ],
      },
    ],
    crossProductPromotions: [promo_FulloriaSboosterCanulas, promo_Full],
  },
  {
    id: "HyalDew Shine",
    brand: "HYALDEW",
    name: "SHINE SkinBooster",
    category: "SkinBooster",
    description:
      "HyalDew SHINE de SUVANZA es un ácido hialurónico con lidocaína diseñado para zonas delicadas y superficiales, aportando luminosidad, suavidad y definición sutil. Es ideal para rejuvenecimiento y revitalización de áreas finas, como periorbitales y pómulos, y puede aplicarse mediante microinyecciones lineales, bolos superficiales o técnica en abanico, adaptándose a las necesidades del paciente para resultados visibles, naturales y duraderos.",
    imageUrls: ["/images/products/hyaldew/4.jpg"],
    priceTiers: [],
    variants: [
      {
        id: "HyalDew Shine",
        name: "SHINE SkinBooster",
        imageUrls: ["/images/products/hyaldew/4.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 85000 },
          { minQuantity: 5, pricePerUnit: 75000 },
        ],
      },
    ],
  },
  {
    id: "Xela Rederm 1.1%",
    brand: "XELA REDERM",
    name: "AH + ACIDO SUCCINICO",
    category: "Redermalización",
    description:
      "Xela Rederm de SUVANZA combina ácido hialurónico y ácido succínico para promover la regeneración y revitalización celular. Sus distintas concentraciones se adaptan a cada necesidad: 1.1 mg/ml ideal para ojeras y zonas delicadas, 1.8 mg/ml para firmeza y textura, y 2.2 mg/ml para bioestimulación profunda. El ácido succínico potencia la energía celular y protege frente al estrés oxidativo, favoreciendo elasticidad, tonicidad y luminosidad. Xela Rederm es una herramienta versátil para rejuvenecimiento y bioreparación dérmica, con resultados visibles y sostenibles.",
    priceTiers: [],
    imageUrls: ["/images/products/xela-rederm/1.png"],
    variants: [
      {
        id: "Xela Rederm 1.1%",
        name: "Xela Rederm 1.1%",
        imageUrls: [
          "/images/products/xela-rederm/2.png",
          "/images/products/xela-rederm/5.jpg",
          "/images/products/xela-rederm/6.jpg",
          "/images/products/xela-rederm/7.jpg",
          "/images/products/xela-rederm/8.jpg",
          "/images/products/xela-rederm/9.jpg",
          "/images/products/xela-rederm/10.jpg",
          "/images/products/xela-rederm/11.jpg",
          "/images/products/xela-rederm/12.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 140000 }],
      },
      {
        id: "Xela Rederm 1.8%",
        name: "Xela Rederm 1.8%",
        imageUrls: [
          "/images/products/xela-rederm/3.png",
          "/images/products/xela-rederm/5.jpg",
          "/images/products/xela-rederm/6.jpg",
          "/images/products/xela-rederm/7.jpg",
          "/images/products/xela-rederm/8.jpg",
          "/images/products/xela-rederm/9.jpg",
          "/images/products/xela-rederm/10.jpg",
          "/images/products/xela-rederm/11.jpg",
          "/images/products/xela-rederm/12.jpg",
        ],

        priceTiers: [{ minQuantity: 1, pricePerUnit: 170000 }],
      },
      {
        id: "Xela Rederm 2.2%",
        name: "Xela Rederm 2.2%",
        imageUrls: [
          "/images/products/xela-rederm/4.png",
          "/images/products/xela-rederm/5.jpg",
          "/images/products/xela-rederm/6.jpg",
          "/images/products/xela-rederm/7.jpg",
          "/images/products/xela-rederm/8.jpg",
          "/images/products/xela-rederm/9.jpg",
          "/images/products/xela-rederm/10.jpg",
          "/images/products/xela-rederm/11.jpg",
          "/images/products/xela-rederm/12.jpg",
        ],

        priceTiers: [{ minQuantity: 1, pricePerUnit: 180000 }],
      },
    ],
    crossProductPromotions: [promo_XelaMix, promo_XelaSbooster, promo_Full],
  },
  {
    id: "Rejeunesse Shape",
    brand: "REJEUNESSE",
    name: "AH Facial (Con lidocaina)",
    category: "Ácido Hialurónico",
    tags: ["Featured"], // MODIFIED
    description:
      "Rejeunesse es un ácido hialurónico con lidocaína de alta calidad coreana, diseñado para modelado y corrección de volúmenes faciales. Sus distintas densidades se adaptan a cada necesidad clínica: SHAPE es una herramienta confiable para protocolos de rejuvenecimiento, remodelación y corrección de volumen, con resultados visibles y duraderos. DEEP, para modelado y soporte de volúmenes más profundos..FINE, ideal para zonas delicadas y definición precisa. Gracias a su tecnología de diálisis, los fillers quedan prácticamente libres de BDDE, ofreciendo máxima seguridad y biocompatibilidad. Su formulación proporciona hidratación, efecto lifting natural y estimulación de la matriz extracelular, favoreciendo elasticidad, firmeza y contorno definido.",
    priceTiers: [],
    imageUrls: ["/images/products/rejeunesse/1.jpg"],
    variants: [
      {
        id: "Rejeunesse Shape",
        name: "SHAPE",
        imageUrls: [
          "/images/products/rejeunesse/shape.png",
          "/images/products/rejeunesse/2.jpg",
          "/images/products/rejeunesse/3.jpg",
          "/images/products/rejeunesse/4.jpg",
          "/images/products/rejeunesse/5.jpg",
          "/images/products/rejeunesse/6.jpg",
          "/images/products/rejeunesse/7.jpg",
          "/images/products/rejeunesse/8.jpg",
          "/images/products/rejeunesse/9.jpg",
          "/images/products/rejeunesse/10.jpg",
          "/images/products/rejeunesse/11.jpg",
          "/images/products/rejeunesse/12.jpg",
          "/images/products/rejeunesse/13.jpg",
          "/images/products/rejeunesse/14.jpg",
          "/images/products/rejeunesse/15.jpg",
          "/images/products/rejeunesse/16.jpg",
          "/images/products/rejeunesse/17.jpg",
          "/images/products/rejeunesse/18.jpg",
          "/images/products/rejeunesse/19.jpg",
        ],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 95000 },
          { minQuantity: 5, pricePerUnit: 85000 },
          { minQuantity: 10, pricePerUnit: 75000 },
        ],
      },
      {
        id: "Rejeunesse Deep",
        name: "DEEP",
        imageUrls: [
          "/images/products/rejeunesse/deep.png",
          "/images/products/rejeunesse/2.jpg",
          "/images/products/rejeunesse/3.jpg",
          "/images/products/rejeunesse/4.jpg",
          "/images/products/rejeunesse/5.jpg",
          "/images/products/rejeunesse/6.jpg",
          "/images/products/rejeunesse/7.jpg",
          "/images/products/rejeunesse/8.jpg",
          "/images/products/rejeunesse/9.jpg",
          "/images/products/rejeunesse/10.jpg",
          "/images/products/rejeunesse/11.jpg",
          "/images/products/rejeunesse/12.jpg",
          "/images/products/rejeunesse/13.jpg",
          "/images/products/rejeunesse/14.jpg",
          "/images/products/rejeunesse/15.jpg",
          "/images/products/rejeunesse/16.jpg",
          "/images/products/rejeunesse/17.jpg",
          "/images/products/rejeunesse/18.jpg",
          "/images/products/rejeunesse/19.jpg",
        ],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 95000 },
          { minQuantity: 5, pricePerUnit: 85000 },
          { minQuantity: 10, pricePerUnit: 75000 },
        ],
      },
      {
        id: "Rejeunesse Fine",
        name: "FINE",
        imageUrls: [
          "/images/products/rejeunesse/fine.png",
          "/images/products/rejeunesse/2.jpg",
          "/images/products/rejeunesse/3.jpg",
          "/images/products/rejeunesse/4.jpg",
          "/images/products/rejeunesse/5.jpg",
          "/images/products/rejeunesse/6.jpg",
          "/images/products/rejeunesse/7.jpg",
          "/images/products/rejeunesse/8.jpg",
          "/images/products/rejeunesse/9.jpg",
          "/images/products/rejeunesse/10.jpg",
          "/images/products/rejeunesse/11.jpg",
          "/images/products/rejeunesse/12.jpg",
          "/images/products/rejeunesse/13.jpg",
          "/images/products/rejeunesse/14.jpg",
          "/images/products/rejeunesse/15.jpg",
          "/images/products/rejeunesse/16.jpg",
          "/images/products/rejeunesse/17.jpg",
          "/images/products/rejeunesse/18.jpg",
          "/images/products/rejeunesse/19.jpg",
        ],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 95000 },
          { minQuantity: 5, pricePerUnit: 85000 },
          { minQuantity: 10, pricePerUnit: 75000 },
        ],
      },
    ],
    crossProductPromotions: [promo_RejeunesseSbooster, promo_RejeunesseExo],
  },
  {
    id: "HyalDew All",
    brand: "HYALDEW",
    name: "AH Facial (Sin lidocaina)",
    category: "Ácido Hialurónico",
    description:
      "HyalDew de SUVANZA es un ácido hialurónico con lidocaína incluida, diseñado para hidratación profunda, remodelación cutánea y bioestimulación. Sus distintas densidades permiten adaptarlo a cada necesidad clínica: ALL para uso general y efecto volumizador equilibrado, MID para áreas que requieren soporte intermedio y definición de contornos.",
    priceTiers: [],
    imageUrls: ["/images/products/hyaldew/1.jpg"],
    variants: [
      {
        id: "HyalDew All",
        name: "ALL",
        imageUrls: ["/images/products/hyaldew/1.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 100000 },
          { minQuantity: 5, pricePerUnit: 90000 },
          { minQuantity: 10, pricePerUnit: 80000 },
        ],
      },
      {
        id: "HyalDew Mid",
        name: "MID",
        imageUrls: ["/images/products/hyaldew/1.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 100000 },
          { minQuantity: 5, pricePerUnit: 90000 },
          { minQuantity: 10, pricePerUnit: 80000 },
        ],
      },
      {
        id: "HyalDew Fine",
        name: "FINE",
        imageUrls: ["/images/products/hyaldew/1.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 100000 },
          { minQuantity: 5, pricePerUnit: 90000 },
          { minQuantity: 10, pricePerUnit: 80000 },
        ],
      },
    ],
  },
  {
    id: "DeneB Classic-S",
    brand: "DeneB",
    name: "AH Corporal",
    category: "Corporal",
    description:
      "DeneB de SUVANZA es un ácido hialurónico de alta cohesividad y lidocaína incluida, especialmente diseñado para modelado y voluminización corporal. Sus densidades permiten adaptarlo a diferentes necesidades: Soft, ideal para zonas que requieren suavidad y modelado uniforme, y Hard, indicado para áreas que necesitan mayor proyección y soporte estructural, como glúteos o pectorales.",
    priceTiers: [],
    imageUrls: ["/images/products/deneb/1.jpg"],
    variants: [
      {
        id: "DeneB Soft",
        name: "SOFT",
        imageUrls: ["/images/products/deneb/1.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 330000 },
          { minQuantity: 6, pricePerUnit: 315000 },
        ],
      },
      {
        id: "DeneB Hard",
        name: "HARD",
        imageUrls: ["/images/products/deneb/1.jpg"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 330000 },
          { minQuantity: 6, pricePerUnit: 315000 },
        ],
      },
    ],
  },
  {
    id: "Premium Ultra Molding 18G 100mm 200mm",
    brand: "Hilos PDO",
    name: "Hilos tensores",
    category: "Hilos",
    tags: ["Featured", "Special"], // MODIFIED
    description:
      "Hilos PDO Da:All son hilos de polidioxanona absorbibles de alta calidad, blancos y prácticamente invisibles, que estimulan la producción de colágeno y ofrecen un efecto tensor y lifting natural. Son biocompatibles y seguros, y su aplicación mínimamente invasiva permite tratamientos en zonas delicadas como nariz, frente y párpados.",
    priceTiers: [],
    imageUrls: ["/images/products/hilos/1.jpg"],
    variants: [
      {
        id: "Premium Ultra Molding 3&4 18G 100mm 200mm",
        name: "Molding 18G 100mm 200mm (x10 hilos)",
        imageUrls: [
          "/images/products/hilos/Premium_Molding.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 265500 }],
      },
      {
        id: "Premium Molding 19G 100mm 200mm",
        name: "Molding 19G 100mm 200mm (x10 hilos)",
        imageUrls: [
          "/images/products/hilos/Premium_Molding.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 252000 }],
      },
      {
        id: "Premium Emboss 19G 100mm 180mm",
        name: "Bidireccionales Emboss 19G 100mm 180mm (x10 hilos)",
        imageUrls: [
          "/images/products/hilos/Premium_Emboss.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 220500 }],
      },
      {
        id: "Spiral Cobra 19G 100mm 200mm",
        name: "Spiral Cobra 19G 100mm 200mm (x10 hilos)",
        imageUrls: [
          "/images/products/hilos/Spiral_Cobra.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 189000 }],
      },
      {
        id: "Spiral Cobra 20G 70mm 140mm",
        name: "Spiral Cobra 20G 70mm 140mm (x10 hilos)",
        imageUrls: [
          "/images/products/hilos/Spiral_Cobra.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 175500 }],
      },
      {
        id: "Braid 5-0 19G 38mm 40mm",
        name: "Braid Trenza x8 19G 38mm 40mm (x8 hilos)",
        imageUrls: [
          "/images/products/hilos/Braid.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 135000 }],
      },
      {
        id: "Braid 5-0 19G 50mm 70mm",
        name: "Braid Trenza x8 19G 50mm 70mm (x8 hilos)",
        imageUrls: [
          "/images/products/hilos/Braid.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 144000 }],
      },
      {
        id: "Braid 7-0 19G 50mm 70mm",
        name: "Braid Trenza x16 19G 50mm 70mm (x8 hilos)",
        imageUrls: [
          "/images/products/hilos/Braid.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 153000 }],
      },
      {
        id: "Mono 29G 25mm 30mm",
        name: "Mono Simple 29G 25mm 30mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 72000 }],
      },
      {
        id: "Mono 29G 38mm 50mm",
        name: "Mono Simple 29G 38mm 50mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 72000 }],
      },
      {
        id: "Mono 27G 60mm 90mm",
        name: "Mono Simple 27G 60mm 90mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 72000 }],
      },
      {
        id: "Mono Screw 29G 25mm 30mm",
        name: "Mono Screw 29G 25mm 30mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 76500 }],
      },
      {
        id: "Mono Screw 29G 38mm 50mm",
        name: "Mono Screw 29G 38mm 50mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 76500 }],
      },
      {
        id: "Mono Screw 27G 60mm 90mm",
        name: "Mono Screw 27G 60mm 90mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 76500 }],
      },
      {
        id: "Mono Screw 25G 90mm 140mm",
        name: "Mono Screw 25G 90mm 140mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Mono_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 76500 }],
      },
      {
        id: "DOBLE SCREW 26G 38mm 50mm",
        name: "Mono Doble Screw 26G 38mm 50mm (x20 hilos)",
        imageUrls: [
          "/images/products/hilos/Double_Screw.jpg",
          "/images/products/hilos/1.jpg",
          "/images/products/hilos/2.jpg",
          "/images/products/hilos/3.jpg",
          "/images/products/hilos/4.jpg",
          "/images/products/hilos/5.jpg",
          "/images/products/hilos/6.jpg",
          "/images/products/hilos/7.jpg",
        ],
        priceTiers: [{ minQuantity: 1, pricePerUnit: 85500 }],
      },
    ],
  },
  {
    id: "Canula 17G 70mm ",
    brand: "Mirror Soft",
    name: "Cánulas y Agujas",
    category: "Insumos",
    description:
      "Mirror Soft ofrece cánulas y agujas de alta calidad para rellenos dérmicos, con punta roma que minimiza dolor y hematomas, y superficie pulida para una inserción suave y precisa. Son biocompatibles, estériles y desechables, compatibles con sistemas Luer y Luer-Lock, y cuentan con marcado cada 10 mm para mayor control. Disponibles en varios diámetros (17G a 30G) y longitudes (25 a 70 mm), se utilizan en procedimientos como rejuvenecimiento facial, corrección de ojeras, aumento de labios y remodelación no quirúrgica de nariz, garantizando seguridad y resultados uniformes.",
    priceTiers: [],
    imageUrls: ["/images/products/mirrorsoft/1.png"],
    variants: [
      {
        id: "Canula 17G 70mm ",
        name: "Cánula 17G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],
        priceTiers: [
          { minQuantity: 1, pricePerUnit: 7350 },
          { minQuantity: 10, pricePerUnit: 6615 },
          { minQuantity: 20, pricePerUnit: 6250 },
          { minQuantity: 50, pricePerUnit: 5880 },
        ],
      },
      {
        id: "Canula 18G 70mm ",
        name: "Cánula 18G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 7350 },
          { minQuantity: 10, pricePerUnit: 6615 },
          { minQuantity: 20, pricePerUnit: 6250 },
          { minQuantity: 50, pricePerUnit: 5880 },
        ],
      },
      {
        id: "Canula 20G 50mm",
        name: "Cánula 20G x 50mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 7350 },
          { minQuantity: 10, pricePerUnit: 6615 },
          { minQuantity: 20, pricePerUnit: 6250 },
          { minQuantity: 50, pricePerUnit: 5880 },
        ],
      },
      {
        id: "Canula 20G 70mm",
        name: "Cánula 20G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 7350 },
          { minQuantity: 10, pricePerUnit: 6615 },
          { minQuantity: 20, pricePerUnit: 6250 },
          { minQuantity: 50, pricePerUnit: 5880 },
        ],
      },
      {
        id: "Canula 21G 50mm",
        name: "Cánula 21G x 50mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 21G 70mm",
        name: "Cánula 21G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 22G 50mm",
        name: "Cánula 22G x 50mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 22G 70mm",
        name: "Cánula 22G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 23G 30mm",
        name: "Cánula 23G x 30mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 23G 50mm",
        name: "Cánula 23G x 50mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 25G 40mm",
        name: "Cánula 25G x 40mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 25G 50mm",
        name: "Cánula 25G x 50mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 25G 60mm",
        name: "Cánula 25G x 60mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 25G 70mm",
        name: "Cánula 25G x 70mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Canula 27G 40mm",
        name: "Cánula 27G x 40mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 4200 },
          { minQuantity: 10, pricePerUnit: 3780 },
          { minQuantity: 20, pricePerUnit: 3570 },
          { minQuantity: 50, pricePerUnit: 3360 },
        ],
      },
      {
        id: "Microaguja 32G 06mm",
        name: "Aguja 32G x 06mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 2500 },
          { minQuantity: 10, pricePerUnit: 2250 },
          { minQuantity: 20, pricePerUnit: 2125 },
          { minQuantity: 50, pricePerUnit: 2000 },
        ],
      },
      {
        id: "Microaguja 33G 04m",
        name: "Aguja 33G x 04mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 2500 },
          { minQuantity: 10, pricePerUnit: 2250 },
          { minQuantity: 20, pricePerUnit: 2125 },
          { minQuantity: 50, pricePerUnit: 2000 },
        ],
      },
      {
        id: "Microaguja 34G 08m",
        name: "Aguja 34G x 08mm",
        imageUrls: ["/images/products/mirrorsoft/3.png"],

        priceTiers: [
          { minQuantity: 1, pricePerUnit: 2800 },
          { minQuantity: 10, pricePerUnit: 2520 },
          { minQuantity: 20, pricePerUnit: 2380 },
          { minQuantity: 50, pricePerUnit: 2240 },
        ],
      },
    ],
  },
];
