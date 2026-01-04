import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const upsert = (model, where, create) =>
    prisma[model].upsert({ where, update: {}, create });

  // --- Media
  const bodySilhouette = await upsert('mediaAsset', { id: 'media_body_svg' }, {
    id: 'media_body_svg', kind: 'image', url: '/img/body-outline.svg', alt: 'Body outline'
  });

  // --- Body parts (6 organs)
  const organs = [
    { id:'bp_heart', name:'Heart', system:'Circulatory', ageBand:'5-7', facts:['Pumps blood','Works with lungs'], place:{ x:.46,y:.34,w:.08,h:.08 } },
    { id:'bp_lungs', name:'Lungs', system:'Respiratory', ageBand:'5-7', facts:['Take in oxygen','Work with heart'], place:{ x:.40,y:.26,w:.20,h:.12 } },
    { id:'bp_brain', name:'Brain', system:'Nervous', ageBand:'5-7', facts:['Sends signals','Controls body'], place:{ x:.46,y:.18,w:.10,h:.08 } },
    { id:'bp_stomach', name:'Stomach', system:'Digestive', ageBand:'5-7', facts:['Breaks down food'], place:{ x:.46,y:.43,w:.12,h:.08 } },
    { id:'bp_liver', name:'Liver', system:'Digestive', ageBand:'8-10', facts:['Cleans blood','Makes bile'], place:{ x:.56,y:.40,w:.10,h:.08 } },
    { id:'bp_intestines', name:'Intestines', system:'Digestive', ageBand:'8-10', facts:['Absorb nutrients'], place:{ x:.44,y:.52,w:.18,h:.12 } },
  ];

  for (const o of organs) {
    await upsert('bodyPart', { id: o.id }, {
      id: o.id, name: o.name, system: o.system, ageBand: o.ageBand,
      imageId: bodySilhouette.id, facts: o.facts,
      placements: { create: [{ x:o.place.x, y:o.place.y, width:o.place.w, height:o.place.h }] },
      functions: { create: [
        { text: (o.name === 'Heart') ? 'Pumps blood around the body'
            : (o.name === 'Lungs') ? 'Bring oxygen into the body'
            : (o.name === 'Brain') ? 'Thinks and sends signals'
            : (o.name === 'Stomach') ? 'Breaks down food'
            : (o.name === 'Liver') ? 'Cleans blood and makes bile'
            : 'Absorbs nutrients from food', correct: true },
        { text: 'Stores memories', correct: false },
        { text: 'Moves the whole body', correct: false }
      ] }
    });
  }

  // --- Organisms
  await upsert('organism', { id: 'org_frog' }, {
    id: 'org_frog', common: 'Frog', habitat: 'Pond',
    lifeCycle: ['egg','tadpole','froglet','frog'], ageBand: '5-7'
  });
  await upsert('organism', { id: 'org_butterfly' }, {
    id: 'org_butterfly', common: 'Butterfly', habitat: 'Garden',
    lifeCycle: ['egg','caterpillar','chrysalis','butterfly'], ageBand: '5-7'
  });
  await upsert('organism', { id: 'org_bean' }, {
    id: 'org_bean', common: 'Bean Plant', habitat: 'Garden',
    lifeCycle: ['seed','sprout','young plant','adult plant'], ageBand: '5-7'
  });

  // --- Questions
  // 1) Anatomy — drag label (Heart & Lungs)
  await upsert('question', { id: 'q_drag_anatomy_1' }, {
    id: 'q_drag_anatomy_1', topic: 'anatomy', type: 'drag-label', ageBand: '5-7',
    prompt: 'Drag the labels onto the body: Heart and Lungs',
    mediaId: bodySilhouette.id,
    data: {
      silhouette: '/img/body-outline.svg',
      targets: [
        { id: 't_heart', x: 0.46, y: 0.34, w: 0.08, h: 0.08, label: 'Heart', bodyPartId: 'bp_heart' },
        { id: 't_lungs', x: 0.40, y: 0.26, w: 0.20, h: 0.12, label: 'Lungs', bodyPartId: 'bp_lungs' }
      ],
      labels: [
        { id: 'l_heart', text: 'Heart', bodyPartId: 'bp_heart' },
        { id: 'l_lungs', text: 'Lungs', bodyPartId: 'bp_lungs' }
      ]
    },
    answers: { create: [{ text: 'Correct placements', correct: true }] }
  });

  // 2) Anatomy — drag label (4 organs)
  await upsert('question', { id: 'q_drag_anatomy_2' }, {
    id: 'q_drag_anatomy_2', topic: 'anatomy', type: 'drag-label', ageBand: '5-7',
    prompt: 'Place Heart, Lungs, Brain, and Stomach.',
    mediaId: bodySilhouette.id,
    data: {
      silhouette: '/img/body-outline.svg',
      targets: [
        { id: 't_heart', x: 0.46, y: 0.34, w: 0.08, h: 0.08, label: 'Heart', bodyPartId: 'bp_heart' },
        { id: 't_lungs', x: 0.40, y: 0.26, w: 0.20, h: 0.12, label: 'Lungs', bodyPartId: 'bp_lungs' },
        { id: 't_brain', x: 0.46, y: 0.18, w: 0.10, h: 0.08, label: 'Brain', bodyPartId: 'bp_brain' },
        { id: 't_stomach', x: 0.46, y: 0.43, w: 0.12, h: 0.08, label: 'Stomach', bodyPartId: 'bp_stomach' }
      ],
      labels: [
        { id: 'l_heart', text: 'Heart', bodyPartId: 'bp_heart' },
        { id: 'l_lungs', text: 'Lungs', bodyPartId: 'bp_lungs' },
        { id: 'l_brain', text: 'Brain', bodyPartId: 'bp_brain' },
        { id: 'l_stomach', text: 'Stomach', bodyPartId: 'bp_stomach' }
      ]
    },
    answers: { create: [{ text: 'Correct placements', correct: true }] }
  });

  // 3) Anatomy — MCQ
  await upsert('question', { id: 'q_mcq_anatomy_func_1' }, {
    id: 'q_mcq_anatomy_func_1', topic: 'anatomy', type: 'mcq', ageBand: '5-7',
    prompt: 'Which organ pumps blood around the body?',
    data: {},
    answers: { create: [
      { text: 'Heart', correct: true },
      { text: 'Lungs', correct: false },
      { text: 'Stomach', correct: false }
    ] }
  });

  // 4) Life Cycle — MCQ
  await upsert('question', { id: 'q_mcq_lifecycle_1' }, {
    id: 'q_mcq_lifecycle_1', topic: 'life-cycle', type: 'mcq', ageBand: '5-7',
    prompt: 'Which stage comes first in a frog’s life?',
    data: {},
    answers: { create: [
      { text: 'Egg', correct: true },
      { text: 'Froglet', correct: false },
      { text: 'Tadpole', correct: false }
    ] }
  });

  // 5) Life Cycle — Sequence
  await upsert('question', { id: 'q_seq_lifecycle_frog_1' }, {
    id: 'q_seq_lifecycle_frog_1', topic: 'life-cycle', type: 'sequence', ageBand: '5-7',
    prompt: 'Put the frog life cycle in order.',
    data: { items: ['tadpole','frog','froglet','egg'], correct: ['egg','tadpole','froglet','frog'] },
    answers: { create: [{ text: 'Ordered correctly', correct: true }] }
  });

  // 6) Microbes — Sort
  await upsert('question', { id: 'q_sort_microbes_1' }, {
    id: 'q_sort_microbes_1', topic: 'microbes', type: 'sort', ageBand: '5-7',
    prompt: 'Sort cards: put helpful things in Bucket B, others in A.',
    data: { A: 'Other', B: 'Helpful' },
    answers: { create: [
      { text: 'Yogurt bacteria help digestion', correct: true },
      { text: 'Not washing hands after toilet', correct: false },
      { text: 'Bread yeast helps dough rise', correct: true },
      { text: 'Coughing on others', correct: false }
    ] }
  });

  // 7) Microbes — MCQ
  await upsert('question', { id: 'q_mcq_microbes_hygiene_1' }, {
    id: 'q_mcq_microbes_hygiene_1', topic: 'microbes', type: 'mcq', ageBand: '5-7',
    prompt: 'Which action helps stop germs spreading?',
    data: {},
    answers: { create: [
      { text: 'Washing hands with soap', correct: true },
      { text: 'Sharing water bottles', correct: false },
      { text: 'Coughing without covering', correct: false }
    ] }
  });

  console.log('Seeded demo content (expanded).');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });