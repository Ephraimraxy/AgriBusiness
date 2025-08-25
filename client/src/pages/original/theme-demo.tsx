import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle, SimpleThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Palette, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Info,
  Star,
  Heart,
  Zap
} from 'lucide-react';

export default function ThemeDemoPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Palette className="text-2xl text-primary" size={32} />
              <h1 className="text-xl font-semibold text-foreground">Theme Demo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Theme Info */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="text-primary" size={24} />
                Current Theme Status
              </CardTitle>
              <CardDescription>
                See how the theme system works and test different components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Selected Theme:</span>
                  <Badge variant="secondary">{theme}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Resolved Theme:</span>
                  <Badge variant="outline">{resolvedTheme}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">System Preference:</span>
                  <Badge variant="outline">
                    {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Theme Controls */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Theme Controls</CardTitle>
              <CardDescription>Test different theme switching methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  onClick={() => setTheme('light')}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <Sun className="mr-2" size={16} />
                  Light Mode
                </Button>
                <Button 
                  onClick={() => setTheme('dark')}
                  className="bg-slate-800 hover:bg-slate-900 text-white"
                >
                  <Moon className="mr-2" size={16} />
                  Dark Mode
                </Button>
                <Button 
                  onClick={() => setTheme('system')}
                  variant="outline"
                >
                  <Monitor className="mr-2" size={16} />
                  System
                </Button>
                <SimpleThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Different button variants and states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
                <Button disabled>Disabled</Button>
              </div>
            </CardContent>
          </Card>

          {/* Form Elements */}
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
              <CardDescription>Input fields and form controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter your name..." />
              <Textarea placeholder="Enter your message..." rows={3} />
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="demo-checkbox" className="rounded" />
                <label htmlFor="demo-checkbox" className="text-sm text-foreground">
                  Accept terms and conditions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input type="radio" id="demo-radio" name="demo" className="rounded-full" />
                <label htmlFor="demo-radio" className="text-sm text-foreground">
                  Option 1
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Cards and Content */}
          <Card>
            <CardHeader>
              <CardTitle>Cards and Content</CardTitle>
              <CardDescription>Different card styles and content layouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">This is a muted card with secondary content.</p>
                </CardContent>
              </Card>
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Regular Content</h4>
                <p className="text-muted-foreground">This is regular content with proper theming.</p>
              </div>
            </CardContent>
          </Card>

          {/* Alerts and Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts and Notifications</CardTitle>
              <CardDescription>Different types of alerts and status indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
                <span className="text-green-800 dark:text-green-200">Success message</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
                <span className="text-yellow-800 dark:text-yellow-200">Warning message</span>
              </div>
              <div className="flex items-center space-x-2 p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="text-blue-600 dark:text-blue-400" size={20} />
                <span className="text-blue-800 dark:text-blue-200">Info message</span>
              </div>
            </CardContent>
          </Card>

          {/* Icons and Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Icons and Badges</CardTitle>
              <CardDescription>Iconography and status indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Star className="text-yellow-500" size={24} />
                <Heart className="text-red-500" size={24} />
                <Zap className="text-blue-500" size={24} />
                <Eye className="text-green-500" size={24} />
                <EyeOff className="text-gray-500" size={24} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Theme color variables demonstration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-8 bg-primary rounded flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-medium">Primary</span>
                  </div>
                  <div className="h-8 bg-secondary rounded flex items-center justify-center">
                    <span className="text-secondary-foreground text-xs font-medium">Secondary</span>
                  </div>
                  <div className="h-8 bg-muted rounded flex items-center justify-center">
                    <span className="text-muted-foreground text-xs font-medium">Muted</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-8 bg-accent rounded flex items-center justify-center">
                    <span className="text-accent-foreground text-xs font-medium">Accent</span>
                  </div>
                  <div className="h-8 bg-destructive rounded flex items-center justify-center">
                    <span className="text-destructive-foreground text-xs font-medium">Destructive</span>
                  </div>
                  <div className="h-8 bg-card border border-border rounded flex items-center justify-center">
                    <span className="text-card-foreground text-xs font-medium">Card</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Theme Features */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Theme Features</CardTitle>
              <CardDescription>Key features of the theme system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sun className="text-primary" size={24} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Light Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Clean, bright interface with high contrast for daytime use
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Moon className="text-primary" size={24} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Dark Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Easy on the eyes with reduced brightness for nighttime use
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Monitor className="text-primary" size={24} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">System Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically follows your system's theme preference
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 