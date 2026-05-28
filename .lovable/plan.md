I will add an image upload option to the "Individual Campaign" (Individual Sender) feature, as well as to other campaign and automation builders.

### Technical Details
- **Individual Sender**: Add a file upload button and logic to `src/components/campaigns/IndividualSender.tsx`. Uploaded images will be stored in the `whatsapp-media` Supabase bucket.
- **Campaign Wizard**: Add image upload to the message creation step in `src/components/campaigns/CreateCampaignView.tsx`.
- **Carousel Builder**: Add image upload to each card in `src/components/campaigns/CarouselBuilder.tsx`.
- **Automation Flows**: Add image upload to the flow editor in `src/components/automations/FlowEditor.tsx`.
- **Naming**: Rename "Envio Individual" to "Campanha Individual" in the UI to match your request.

### Implementation Steps
1. Create a hidden `input type="file"` and a trigger button for each component.
2. Implement an `handleFileUpload` function using `supabase.storage.from('whatsapp-media').upload()`.
3. Update the `mediaUrl` state with the public URL returned after upload.
4. Show a loading state during the upload process.
5. Update the UI labels to be consistent with "Campanha Individual".

Summary: Adding image upload functionality to individual senders and campaigns, and updating labels.