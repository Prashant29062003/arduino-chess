#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- STATE MANAGEMENT ---
int prev_count1 = 0; 
int prev_count2 = 0;

// LCD Setup (Address 0x27 assumed)
LiquidCrystal_I2C lcd(0x27, 16, 2); 

// Input Pins (H2 & G1 Squares)
const int BOX1_PINS[] = {2, 3, 4, 5, 6};  // H2 Square Inputs (Pawn)
const int BOX1_SIZE = 5;
const int BOX2_PINS[] = {7, 8, 9, 10, 11}; // G1 Square Inputs (Knight)
const int BOX2_SIZE = 5;

// --- LED OUTPUT PINS (Final Mapping) ---
const int COMMON_LED = A0;      
const int PAWN_LED_EXCLUSIVE = 13; 
const int KNIGHT_LED_EXCLUSIVE = 12; 

// Function Prototypes
void identifyAndDisplay(int count, const char* squareName);
void displayRemoval(int count, const char* squareName);
int countActiveJumpers(const int pins[], int size);

void setup() {
  Serial.begin(9600);
  Serial.println("\n--- Smart Chessboard System Initialized ---");
  
  // LCD Setup... 
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Chessboard");
  lcd.setCursor(0, 1);
  lcd.print("Ready...");
  delay(2000);
  lcd.clear();

  // Input Pins setup
  for (int i = 0; i < BOX1_SIZE; i++) {
    pinMode(BOX1_PINS[i], INPUT_PULLUP);
  }
  for (int i = 0; i < BOX2_SIZE; i++) {
    pinMode(BOX2_PINS[i], INPUT_PULLUP);
  }

  // LED Output Pins setup
  pinMode(COMMON_LED, OUTPUT);
  pinMode(PAWN_LED_EXCLUSIVE, OUTPUT);
  pinMode(KNIGHT_LED_EXCLUSIVE, OUTPUT);
  
  // Ensure LEDs are OFF initially
  digitalWrite(COMMON_LED, LOW);
  digitalWrite(PAWN_LED_EXCLUSIVE, LOW);
  digitalWrite(KNIGHT_LED_EXCLUSIVE, LOW);
}

int countActiveJumpers(const int pins[], int size) {
  int active_count = 0;
  for (int i = 0; i < size; i++) {
    if (digitalRead(pins[i]) == LOW) {
      active_count++;
    }
  }
  return active_count;
}

void loop() {
  int count1 = countActiveJumpers(BOX1_PINS, BOX1_SIZE); // H2 Count
  int count2 = countActiveJumpers(BOX2_PINS, BOX2_SIZE); // G1 Count
  
  Serial.println("--- Scanning ---");

  bool eventDetected = false;

  // --- A. REMOVAL DETECTION ---
  if (prev_count1 > 0 && count1 == 0) {
    displayRemoval(prev_count1, "H2"); 
    eventDetected = true;
  } else if (prev_count2 > 0 && count2 == 0) {
    displayRemoval(prev_count2, "G1");
    eventDetected = true;
  }

  // --- B. PLACEMENT DETECTION ---
  else if (count1 > 0 && count2 == 0 && prev_count1 == 0) { 
    lcd.clear(); 
    lcd.setCursor(0, 0);
    lcd.print("Square: H2"); 
    identifyAndDisplay(count1, "H2");
    eventDetected = true;
  } else if (count2 > 0 && count1 == 0 && prev_count2 == 0) { 
    lcd.clear(); 
    lcd.setCursor(0, 0);
    lcd.print("Square: G1"); 
    identifyAndDisplay(count2, "G1");
    eventDetected = true;
  } 
  
  // --- C. NO EVENT / ERROR ---
  else if (!eventDetected) {
    if (count1 == 0 && count2 == 0) {
        lcd.clear(); lcd.setCursor(0, 0); lcd.print("No Piece Placed");
    } else if (count1 > 0 && count2 > 0) {
        lcd.clear(); lcd.setCursor(0, 0); lcd.print("ERROR / OVERLAP!");
    }
  }

  // --- D. STATE UPDATE & SMART DELAY ---
  prev_count1 = count1;
  prev_count2 = count2;

  if (eventDetected) {
    delay(2500); // Wait after event message
  } else {
    delay(500); // Normal scan
  }
}

// --- FUNCTION DEFINITIONS (Placement & Identity) ---
void identifyAndDisplay(int count, const char* squareName) {
  lcd.setCursor(0, 1);
  lcd.print("Piece: ");
  Serial.print("EVENT: PLACED | Location: "); Serial.print(squareName); Serial.print(" | ");
  if (count == 1) {
    lcd.print("Pawn");
    Serial.println("Piece: Pawn Detected");
  } else if (count == 2) {
    lcd.print("Knight");
    Serial.println("Piece: Knight Detected");
  } else {
    lcd.print("UNKNOWN...");
    Serial.println("Piece: UNKNOWN");
  }
}

// --- REMOVAL AND PATH ILLUMINATION LOGIC (Focus of the Fix) ---
void displayRemoval(int count, const char* squareName) {
  const char* pieceName;
  
  // Step 1: Sabhi Exclusive LEDs ko OFF karo (Clean Slate)
  digitalWrite(PAWN_LED_EXCLUSIVE, LOW);
  digitalWrite(KNIGHT_LED_EXCLUSIVE, LOW);
  digitalWrite(COMMON_LED, LOW); // Pehle hi ensure karo ki OFF hain
  
  // LCD Output
  lcd.setCursor(0, 0);
  
  // Step 2 & 3: Piece Identity check karo aur LEDs ON karo
  if (count == 1) { // Pawn
    pieceName = "Pawn";
    digitalWrite(PAWN_LED_EXCLUSIVE, HIGH);
    digitalWrite(COMMON_LED, HIGH); // Common ON
    Serial.println("LED DEBUG: Pawn LED (D13) and Common LED (A0) are HIGH."); // NEW DEBUG LINE

  } else if (count == 2) { // Knight
    pieceName = "Knight"; 
    digitalWrite(KNIGHT_LED_EXCLUSIVE, HIGH);
    digitalWrite(COMMON_LED, HIGH); // Common ON
    Serial.println("LED DEBUG: Knight LED (D12) and Common LED (A0) are HIGH."); // NEW DEBUG LINE

  } else {
    pieceName = "UNKNOWN";
  }
  
  lcd.print(pieceName);
  lcd.print(" REMOVED");
  lcd.setCursor(0, 1);
  lcd.print("Path for ");
  lcd.print(squareName);
  
  // Serial Output
  Serial.print("EVENT: REMOVED | Piece: "); Serial.print(pieceName);
  Serial.print(" | Path Shown from: "); Serial.println(squareName);
  
  // LEDs ko 2 SECONDS tak ON rakho (Testing ke liye chota time)
  delay(2000); 

  // Step 4: Sabhi LEDs ko OFF kar do
  digitalWrite(COMMON_LED, LOW);
  digitalWrite(PAWN_LED_EXCLUSIVE, LOW);
  digitalWrite(KNIGHT_LED_EXCLUSIVE, LOW);
  Serial.println("LED DEBUG: All LEDs turned LOW."); // NEW DEBUG LINE
}