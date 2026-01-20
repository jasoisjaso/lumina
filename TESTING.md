# Lumina v1.0 Testing Guide

## Mobile & PWA Testing Checklist

### PWA Installation
- [ ] **Install to Home Screen (iOS)**
  1. Open Safari on iPhone/iPad
  2. Navigate to Lumina
  3. Tap Share button → "Add to Home Screen"
  4. Verify icon appears on home screen
  5. Launch from home screen → should open in standalone mode
  6. Verify status bar color matches theme (#4F46E5)

- [ ] **Install to Home Screen (Android)**
  1. Open Chrome on Android device
  2. Navigate to Lumina
  3. Tap "Add to Home Screen" prompt or menu
  4. Verify icon appears on home screen
  5. Launch from home screen → should open in standalone mode
  6. Verify splash screen shows Lumina branding

- [ ] **Offline Functionality**
  1. Load Lumina while online
  2. Navigate to different views (Calendar, Photos)
  3. Turn off WiFi/data
  4. Refresh page → should load from cache
  5. Try navigating → cached pages should work
  6. API calls should show cached data or offline message
  7. Turn WiFi back on → should sync new data

### Mobile Navigation
- [ ] **Bottom Navigation Bar**
  1. Verify bottom nav appears on mobile (< 768px)
  2. Verify bottom nav hidden on desktop (≥ 768px)
  3. Test all 4 navigation items (Home, Calendar, Photos, Weather)
  4. Verify active state highlights correctly
  5. Verify icons are large enough (44x44px minimum)
  6. Verify safe area padding on notched phones

- [ ] **Slide-up Drawer**
  1. Tap Home icon in bottom nav
  2. Drawer should slide up from bottom
  3. Verify handle at top for dragging
  4. Tap outside drawer → should close
  5. Tap close button → should close
  6. Test Settings button (admin only)
  7. Test Kiosk Mode button
  8. Verify all buttons are touch-friendly (56px minimum)

### Touch Gestures
- [ ] **Calendar Swipe Navigation**
  1. Open Calendar on mobile
  2. Swipe left → should navigate to next month
  3. Swipe right → should navigate to previous month
  4. Fast swipe should trigger, slow drag should not

- [ ] **Pull to Refresh**
  1. On Calendar view, pull down from top
  2. Verify pull indicator appears
  3. Release when threshold reached
  4. Should show loading spinner
  5. Should refresh calendar events
  6. Repeat for Photo Gallery

- [ ] **Photo Gallery Gestures**
  1. In photo gallery, tap a photo
  2. Pinch to zoom (future enhancement)
  3. Swipe to close detail view
  4. Test on various photo sizes

### Responsive Layout
- [ ] **Calendar Component**
  1. Test on mobile (320px, 375px, 414px widths)
  2. Verify single column layout
  3. Verify event cards are readable
  4. Test create event modal → should slide from bottom
  5. Test edit event modal → should slide from bottom
  6. Verify all buttons ≥ 44px touch target
  7. Test month navigation
  8. Verify FullCalendar header is responsive

- [ ] **Photo Gallery Component**
  1. Test on mobile (320px, 375px, 414px widths)
  2. Verify single column masonry on mobile
  3. Verify 2 columns on tablet (768px+)
  4. Test upload button → large enough to tap
  5. Test pagination buttons → large touch targets
  6. Verify photos load with lazy loading
  7. Test album filter horizontal scroll

- [ ] **Weather Widget**
  1. Verify appears in header on desktop
  2. Verify appears in mobile header (compact)
  3. Verify temperature is readable
  4. Verify icon displays correctly
  5. Test in different weather conditions

- [ ] **Settings Panel**
  1. Open settings on mobile
  2. Verify tabs are accessible
  3. Verify content doesn't overflow tabs
  4. Test tab switching
  5. Test form inputs → should be touch-friendly
  6. Test save/cancel buttons
  7. Verify closes properly

### Kiosk Mode
- [ ] **Kiosk Entry**
  1. Access via bottom nav drawer
  2. Access via /kiosk URL
  3. Access via ?kiosk=true parameter
  4. Verify fullscreen mode activates

- [ ] **Kiosk Slideshow**
  1. Verify slideshow starts automatically
  2. Test photo slides display correctly
  3. Test calendar slides show upcoming events
  4. Test weather slide displays
  5. Test dashboard slide shows time/date
  6. Verify slides transition smoothly (300ms)
  7. Test slide indicators at bottom
  8. Wait 2 minutes → should auto-start

- [ ] **Kiosk Exit**
  1. Triple-tap top-left corner (100x100px area)
  2. Should exit to normal mode
  3. Verify fullscreen mode exits
  4. Test "Tap anywhere to exit" from slideshow

- [ ] **Kiosk Idle Detection**
  1. Enter kiosk mode
  2. Wait 2 minutes without interaction
  3. Slideshow should start automatically
  4. Tap screen → should exit slideshow
  5. Test with mouse movement, keyboard, touch, scroll

### Performance
- [ ] **Page Load Speed**
  1. Measure initial page load (< 3s on 3G)
  2. Measure time to interactive (< 5s on 3G)
  3. Check Lighthouse performance score (> 90)

- [ ] **Lazy Loading**
  1. Open Network tab in DevTools
  2. Navigate to Photo Gallery
  3. Verify only visible images load initially
  4. Scroll down → verify images load as they approach viewport

- [ ] **Code Splitting**
  1. Check Network tab → verify multiple JS chunks
  2. Navigate between views → verify chunks load on demand
  3. Verify loading fallback shows during chunk load

### Browser Compatibility
- [ ] **iOS Safari** (iOS 14+)
  - [ ] PWA installation works
  - [ ] Touch gestures work
  - [ ] Modals slide from bottom
  - [ ] Safe areas respected (iPhone X+)
  - [ ] Service worker caches properly

- [ ] **Android Chrome** (Android 8+)
  - [ ] PWA installation works
  - [ ] Touch gestures work
  - [ ] Bottom nav displays correctly
  - [ ] Offline mode works

- [ ] **Desktop Chrome** (Latest)
  - [ ] All features work
  - [ ] Desktop layout displays
  - [ ] Mouse interactions work

- [ ] **Desktop Firefox** (Latest)
  - [ ] All features work
  - [ ] Layout matches Chrome

- [ ] **Desktop Safari** (Latest)
  - [ ] All features work
  - [ ] Calendar displays correctly

### Accessibility
- [ ] **Touch Targets**
  1. Measure all buttons/links
  2. Verify minimum 44x44px (iOS) or 48x48px (Android)
  3. Check spacing between targets (8px minimum)

- [ ] **Keyboard Navigation**
  1. Tab through all interactive elements
  2. Verify focus visible
  3. Verify logical tab order
  4. Test Enter/Space for activation

- [ ] **Screen Reader** (VoiceOver/TalkBack)
  1. Enable screen reader
  2. Navigate through app
  3. Verify all buttons have labels
  4. Verify images have alt text
  5. Verify form inputs have labels

- [ ] **Color Contrast**
  1. Check contrast ratio ≥ 4.5:1 for text
  2. Check contrast ratio ≥ 3:1 for UI elements
  3. Use Lighthouse or axe DevTools

### Edge Cases
- [ ] **Network Failures**
  1. Simulate offline while using app
  2. Verify graceful error messages
  3. Verify cached data still accessible
  4. Simulate slow 3G → verify app usable

- [ ] **Small Screens**
  1. Test on 320px width (iPhone SE)
  2. Verify no horizontal scroll
  3. Verify all content accessible

- [ ] **Large Screens**
  1. Test on 2560px+ width
  2. Verify layout doesn't stretch awkwardly
  3. Verify max-width constraints applied

- [ ] **Landscape Orientation**
  1. Rotate device to landscape
  2. Verify layout adapts
  3. Verify kiosk mode works in landscape

- [ ] **Memory/Battery**
  1. Leave app open for 30+ minutes
  2. Check memory usage doesn't grow
  3. Verify no memory leaks (Chrome DevTools)
  4. Check battery drain is reasonable

### Security
- [ ] **Authentication**
  1. Verify JWT tokens stored securely
  2. Verify auto-logout on token expiry
  3. Verify refresh token works
  4. Test with expired tokens

- [ ] **Photo Upload**
  1. Verify file type validation
  2. Verify file size limits enforced
  3. Test malicious file uploads → should reject
  4. Verify directory traversal prevention

- [ ] **API Security**
  1. Verify all API calls require auth
  2. Verify CORS configured correctly
  3. Test with invalid tokens → should reject

## Bug Reporting Template

When you find a bug, report it with:

```markdown
**Title**: Brief description
**Priority**: Critical | High | Medium | Low
**Device**: iPhone 12 Pro / iPad / Android Pixel 5 / Desktop Chrome
**OS**: iOS 16.5 / Android 13 / macOS Ventura
**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected**: What should happen
**Actual**: What actually happens
**Screenshots**: Attach if applicable
```

## Automated Testing (Future)
Consider adding:
- Jest unit tests for components
- React Testing Library integration tests
- Cypress E2E tests for critical paths
- Lighthouse CI for performance monitoring
- Percy for visual regression testing
