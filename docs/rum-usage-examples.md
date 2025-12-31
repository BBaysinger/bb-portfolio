# AWS CloudWatch RUM Usage Examples

## User Identification

When a user logs in, their user ID is automatically tracked in RUM to associate all their actions with their account:

```tsx
// This happens automatically in RUMInitializer when user logs in
import { setRUMUser, clearRUMUser } from "@/services/rum";

// Set user ID after login (done automatically)
if (user?.id) {
  setRUMUser(user.id);
}

// Clear user ID after logout (done automatically)
clearRUMUser();
```

**What gets tracked:**

- User ID from Payload CMS auth system
- All events, page views, and errors are associated with the user
- Session tracking across multiple visits
- Performance metrics per user

**Privacy Note:** Only the user ID is tracked, no PII (email, name, etc.)

## Recording Click Events

### Basic Button Click

```tsx
import { recordClick } from "@/services/rum";

export function CTAButton() {
  return (
    <button onClick={() => recordClick("hero-cta", "Get Started")}>
      Get Started
    </button>
  );
}
```

### Link Click with Context

```tsx
import { recordClick } from "@/services/rum";

export function ProjectCard({ projectId, title }: Props) {
  return (
    <a
      href={`/project/${projectId}`}
      onClick={() =>
        recordClick(`project-card-${projectId}`, title, {
          category: "portfolio",
          projectId,
        })
      }
    >
      {title}
    </a>
  );
}
```

### Navigation Menu Click

```tsx
import { recordClick } from "@/services/rum";

export function NavLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      onClick={() =>
        recordClick(`nav-${label.toLowerCase()}`, `Navigation: ${label}`)
      }
    >
      {label}
    </Link>
  );
}
```

## Recording Custom Events

### Form Submission

```tsx
import { recordEvent } from "@/services/rum";

export function ContactForm() {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    recordEvent("form_submission", {
      formType: "contact",
      hasName: true,
      hasEmail: true,
      hasMessage: true,
    });

    // ... rest of form logic
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Search Query

```tsx
import { recordEvent } from "@/services/rum";

export function SearchBar() {
  const handleSearch = (query: string) => {
    recordEvent("search", {
      queryLength: query.length,
      hasResults: results.length > 0,
      resultCount: results.length,
    });
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

### Video Play/Pause

```tsx
import { recordEvent } from "@/services/rum";

export function VideoPlayer({ videoId, title }: Props) {
  return (
    <video
      onPlay={() => recordEvent("video_play", { videoId, title })}
      onPause={() => recordEvent("video_pause", { videoId, title })}
      onEnded={() => recordEvent("video_complete", { videoId, title })}
    >
      <source src={src} />
    </video>
  );
}
```

### Slinger Toss (Homepage Hero)

```tsx
import { recordEvent } from "@/services/rum";

// Called when the orb is released (tossed) after a drag gesture
recordEvent("slinger_toss", {
  inputType: "mouse" | "touch",
  vx: 1.23,
  vy: -0.45,
  speed: 1.31,
});
```

## What's Tracked Automatically

CloudWatch RUM automatically tracks:

- ✅ Page load performance (LCP, FID, CLS)
- ✅ JavaScript errors and exceptions
- ✅ HTTP/fetch requests (success, errors, timing)
- ✅ Page views (via our RUMInitializer component)

## What Requires Manual Tracking

You need to manually track:

- ❌ Button clicks
- ❌ Link clicks (for analytics)
- ❌ Form submissions
- ❌ Modal opens/closes
- ❌ Tab switches
- ❌ Video/audio interactions
- ❌ Search queries
- ❌ Any other user interactions

## Best Practices

1. **Use consistent naming**: Prefix IDs by component type (`nav-`, `cta-`, `project-`)
2. **Include context**: Add page, category, or other relevant metadata
3. **Don't track PII**: Never send email addresses, names, or sensitive data
4. **Batch related events**: Group similar interactions under one event type
5. **Test locally**: Events are only sent in production, but you can verify initialization in dev
